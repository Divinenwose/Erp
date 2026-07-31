'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const isInitialized = useRef(false);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[AUTH] Fetching profile for user:', userId);
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('[AUTH] Profile data:', prof);
      console.log('[AUTH] Profile error:', profError);

      if (profError) {
        console.error('[AUTH] Error fetching profile:', profError);
        return;
      }

      if (prof) {
        setProfile(prof as Profile);
        if (prof.company_id) {
          console.log('[AUTH] Fetching company for company_id:', prof.company_id);
          const { data: comp, error: compError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', prof.company_id)
            .maybeSingle();

          console.log('[AUTH] Company data:', comp);
          console.log('[AUTH] Company error:', compError);

          if (compError) {
            console.error('[AUTH] Error fetching company:', compError);
            return;
          }

          setCompany(comp as Company);

          // Check if departments exist for this company, sync if missing
          if (comp) {
            const { data: depts, error: deptError } = await supabase
              .from('departments')
              .select('id')
              .eq('company_id', comp.id)
              .limit(1);

            if (!deptError && (!depts || depts.length === 0)) {
              console.log('[AUTH] No departments found, syncing from configuration');
              try {
                const { syncCompanyDepartments } = await import('@/lib/departments');
                await syncCompanyDepartments(comp.id, comp.name);
                console.log('[AUTH] Departments synced successfully');
              } catch (syncError) {
                console.error('[AUTH] Department sync failed:', syncError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[AUTH] Unexpected error in fetchProfile:', error);
    }
  };

  const fetchRolesAndPermissions = async (userId: string) => {
    try {
      console.log('[AUTH] Fetching roles and permissions for user:', userId);
      
      // Fetch user's roles from user_roles table (single source of truth)
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('role_id, roles(*)')
        .eq('user_id', userId);

      console.log('[AUTH] User roles query result:', userRoles);
      console.log('[AUTH] User roles error:', userRolesError);

      if (userRolesError) {
        console.error('[AUTH] Error fetching user roles:', userRolesError);
        setRoles([]);
        setPermissions([]);
        return;
      }

      // Extract roles from the join
      const rolesList = userRoles?.map((ur: any) => ur.roles).filter(Boolean) || [];
      console.log('[AUTH] Roles list:', rolesList);
      setRoles(rolesList);

      // If no roles, return early
      if (rolesList.length === 0) {
        console.log('[AUTH] No roles found for user');
        setPermissions([]);
        return;
      }

      // Get role IDs
      const roleIds = rolesList.map((r: Role) => r.id);
      console.log('[AUTH] Role IDs:', roleIds);

      // Fetch permissions for these roles from role_permissions
      const { data: rolePerms, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .in('role_id', roleIds);

      console.log('[AUTH] Role permissions query result:', rolePerms);
      console.log('[AUTH] Role permissions error:', rolePermsError);

      if (rolePermsError) {
        console.error('[AUTH] Error fetching role permissions:', rolePermsError);
        setPermissions([]);
        return;
      }

      // Get permission IDs
      const permissionIds = rolePerms?.map((rp: any) => rp.permission_id) || [];
      console.log('[AUTH] Permission IDs:', permissionIds);

      if (permissionIds.length === 0) {
        console.log('[AUTH] No permissions found for roles');
        setPermissions([]);
        return;
      }

      // Fetch actual permission details
      const { data: permissions, error: permsError } = await supabase
        .from('permissions')
        .select('*')
        .in('id', permissionIds);

      console.log('[AUTH] Permissions query result:', permissions);
      console.log('[AUTH] Permissions error:', permsError);

      if (permsError) {
        console.error('[AUTH] Error fetching permissions:', permsError);
        setPermissions([]);
        return;
      }

      setPermissions(permissions || []);
    } catch (error) {
      console.error('[AUTH] Unexpected error in fetchRolesAndPermissions:', error);
      setRoles([]);
      setPermissions([]);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchRolesAndPermissions(user.id);
    }
  };

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    let isMounted = true;

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await Promise.all([
          fetchProfile(session.user.id),
          fetchRolesAndPermissions(session.user.id),
        ]);
        if (isMounted) setLoading(false);
      } else {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      
      (async () => {
        if (session?.user && isMounted) {
          await Promise.all([
            fetchProfile(session.user.id),
            fetchRolesAndPermissions(session.user.id),
          ]);
        } else if (!session?.user && isMounted) {
          setProfile(null);
          setCompany(null);
          setRoles([]);
          setPermissions([]);
        }
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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
    console.log('[SIGNUP] STEP 1: Starting signup process');
    console.log('[SIGNUP] Email:', email);
    console.log('[SIGNUP] Company Name:', data.companyName);

    const { data: authData, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      }
    });

    console.log('[SIGNUP] STEP 2: Auth signUp completed');
    console.log('[SIGNUP] Auth error:', error);
    console.log('[SIGNUP] Auth user:', authData.user);
    console.log('[SIGNUP] Auth session:', authData.session);

    if (error) {
      console.error('[SIGNUP] Auth signUp failed:', error);
      return { error: error as Error };
    }

    if (!authData.user) {
      console.error('[SIGNUP] No user returned from signUp');
      return { error: new Error('No user returned from signUp') };
    }

    console.log('[SIGNUP] STEP 3: Checking session after signUp');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[SIGNUP] Current session:', session);
    console.log('[SIGNUP] Session user:', session?.user);
    console.log('[SIGNUP] auth.uid() available:', !!session?.user);

    console.log('[SIGNUP] STEP 4: Creating company');
    const slug = data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Math.random().toString(36).slice(2, 6);
    console.log('[SIGNUP] Company slug:', slug);

    const { data: companyData, error: compError } = await supabase
      .from('companies')
      .insert({ name: data.companyName, slug, email, created_by: authData.user.id })
      .select()
      .single();

    console.log('[SIGNUP] STEP 5: Company insert completed');
    console.log('[SIGNUP] Company error:', compError);
    console.log('[SIGNUP] Company error message:', compError?.message);
    console.log('[SIGNUP] Company error details:', compError?.details);
    console.log('[SIGNUP] Company error hint:', compError?.hint);
    console.log('[SIGNUP] Company error code:', compError?.code);
    console.log('[SIGNUP] Company data:', companyData);

    if (compError) {
      console.error('[SIGNUP] Company insert failed:', compError);
      console.error('[SIGNUP] Full error details:', JSON.stringify(compError, null, 2));
      return { error: compError as Error };
    }

    if (!companyData) {
      console.error('[SIGNUP] No company data returned');
      return { error: new Error('No company data returned') };
    }

    console.log('[SIGNUP] STEP 6: Creating profile');
    const { data: profileData, error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      company_id: companyData.id,
      first_name: data.firstName,
      last_name: data.lastName,
      display_name: `${data.firstName} ${data.lastName}`,
      email,
      role: 'Company Admin',
    }).select().single();

    console.log('[SIGNUP] STEP 7: Profile upsert completed');
    console.log('[SIGNUP] Profile error:', profileError);
    console.log('[SIGNUP] Profile data:', profileData);

    if (profileError) {
      console.error('[SIGNUP] Profile upsert failed:', profileError);
      return { error: profileError as Error };
    }

    console.log('[SIGNUP] STEP 8: Assigning Company Admin role via user_roles');
    // Find the Company Admin role
    const { data: companyAdminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'Company Admin')
      .maybeSingle();

    console.log('[SIGNUP] Company Admin role lookup:', companyAdminRole);
    console.log('[SIGNUP] Role lookup error:', roleError);

    if (companyAdminRole) {
      const { error: userRoleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role_id: companyAdminRole.id,
      });
      console.log('[SIGNUP] user_roles insert error:', userRoleError);
      if (userRoleError) {
        console.error('[SIGNUP] Failed to assign user role:', userRoleError);
        // Don't fail signup, but log the error
      }
    } else {
      console.warn('[SIGNUP] Company Admin role not found in roles table');
    }

    console.log('[SIGNUP] STEP 9: Synchronizing departments');
    // Sync departments from centralized configuration
    try {
      const { syncCompanyDepartments } = await import('@/lib/departments');
      await syncCompanyDepartments(companyData.id, data.companyName);
      console.log('[SIGNUP] Departments synchronized successfully');
    } catch (syncError) {
      console.error('[SIGNUP] Department synchronization failed:', syncError);
      // Don't fail signup, but log the error
    }

    console.log('[SIGNUP] STEP 10: Seeding demo data');
    // Seed demo data in background (employees, customers, etc.)
    try {
      const { seedDemoData } = await import('@/lib/seed');
      await seedDemoData(companyData.id, data.companyName);
      console.log('[SIGNUP] Demo data seeded successfully');
    } catch (seedError) {
      console.error('[SIGNUP] Demo data seeding failed:', seedError);
      // Don't fail signup, but log the error
    }

    console.log('[SIGNUP] STEP 10: Signup completed successfully');
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
