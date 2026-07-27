'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, Company, Role, Permission } from '@/lib/supabase';
import { logAuthEvent } from '@/lib/audit';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, data: { firstName: string; lastName: string; companyName: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasPermission: (permission: string) => boolean;
  can: (resource: string, action: string) => boolean;
  isSuperAdmin: () => boolean;
  isCompanyAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (prof) {
      setProfile(prof as Profile);
      if (prof.company_id) {
        const { data: comp } = await supabase
          .from('companies')
          .select('*')
          .eq('id', prof.company_id)
          .maybeSingle();
        setCompany(comp as Company);
      }
    }
  };

  const fetchRolesAndPermissions = async (userId: string) => {
    // Fetch user's roles from user_roles table
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('role_id, roles(*)')
      .eq('user_id', userId);

    if (userRolesError) {
      console.error('Error fetching user roles:', userRolesError);
      // Fallback: try to get role from profiles.role
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      if (userProfile?.role) {
        // Create a mock role from profiles.role
        const mockRole: Role = {
          id: userProfile.role,
          company_id: profile?.company_id,
          name: userProfile.role,
          description: `${userProfile.role} role`,
          is_system: userProfile.role === 'Company Admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setRoles([mockRole]);

        // For Company Admin fallback, load all permissions
        if (userProfile.role === 'Company Admin') {
          const { data: allPerms } = await supabase
            .from('permissions')
            .select('*');
          setPermissions(allPerms || []);
        }
      }
      return;
    }

    // Extract roles from the join
    const rolesList = userRoles?.map((ur: any) => ur.roles).filter(Boolean) || [];
    setRoles(rolesList);

    // If no roles, return early
    if (rolesList.length === 0) {
      setPermissions([]);
      return;
    }

    // Get role IDs
    const roleIds = rolesList.map((r: Role) => r.id);

    // Fetch permissions for these roles from role_permissions
    const { data: rolePerms, error: rolePermsError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .in('role_id', roleIds);

    if (rolePermsError) {
      console.error('Error fetching role permissions:', rolePermsError);
      setPermissions([]);
      return;
    }

    // Get permission IDs
    const permissionIds = rolePerms?.map((rp: any) => rp.permission_id) || [];

    if (permissionIds.length === 0) {
      setPermissions([]);
      return;
    }

    // Fetch actual permission details
    const { data: permissions, error: permsError } = await supabase
      .from('permissions')
      .select('*')
      .in('id', permissionIds);

    if (permsError) {
      console.error('Error fetching permissions:', permsError);
      setPermissions([]);
      return;
    }

    setPermissions(permissions || []);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchRolesAndPermissions(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([
          fetchProfile(session.user.id),
          fetchRolesAndPermissions(session.user.id),
        ]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      (async () => {
        if (session?.user) {
          await Promise.all([
            fetchProfile(session.user.id),
            fetchRolesAndPermissions(session.user.id),
          ]);
        } else {
          setProfile(null);
          setCompany(null);
          setRoles([]);
          setPermissions([]);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error) {
      // Log login event after successful authentication
      // Note: This will be called again after session is established, but we log here for immediate tracking
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', session.user.id)
          .maybeSingle();
        if (prof?.company_id) {
          logAuthEvent(prof.company_id, session.user.id, 'login', { email });
        }
      }
    }
    
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    data: { firstName: string; lastName: string; companyName: string }
  ) => {
    const { data: authData, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      }
    });
    if (error) return { error: error as Error };

    if (authData.user) {
      const slug = data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Math.random().toString(36).slice(2, 6);
      const { data: companyData, error: compError } = await supabase
        .from('companies')
        .insert({ name: data.companyName, slug, email })
        .select()
        .single();

      if (compError) return { error: compError as Error };

      await supabase.from('profiles').upsert({
        id: authData.user.id,
        company_id: companyData.id,
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: `${data.firstName} ${data.lastName}`,
        email,
        role: 'Company Admin',
      });

      // Note: Since the database uses profiles.role field instead of user_roles table,
      // we don't need to assign roles via user_roles. The role is already set in profiles.

      // Seed demo data in background
      try {
        const { seedDemoData } = await import('@/lib/seed');
        await seedDemoData(companyData.id);
      } catch { /* non-critical */ }
    }

    return { error: null };
  };

  const signOut = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    const companyId = profile?.company_id;
    
    await supabase.auth.signOut();
    setProfile(null);
    setCompany(null);
    setRoles([]);
    setPermissions([]);
    
    // Log logout event
    if (userId && companyId) {
      logAuthEvent(companyId, userId, 'logout');
    }
  };

  // Helper methods for RBAC
  const hasRole = (roleName: string): boolean => {
    return roles.some(r => r.name === roleName);
  };

  const hasPermission = (permission: string): boolean => {
    // Permission format: resource.action (e.g., dashboard.view, hr.employees.view)
    return permissions.some(p => `${p.resource}.${p.action}` === permission);
  };

  const can = (resource: string, action: string): boolean => {
    return hasPermission(`${resource}.${action}`);
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('Super Admin');
  };

  const isCompanyAdmin = (): boolean => {
    return hasRole('Company Admin') || isSuperAdmin();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      company, 
      roles, 
      permissions, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      refreshProfile, 
      hasRole, 
      hasPermission, 
      can, 
      isSuperAdmin, 
      isCompanyAdmin 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
