'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, Company, Role, Permission } from '@/lib/supabase';
import { logAuthEvent } from '@/lib/audit';
import { createCompanyAccount, syncSuperAdminPermissions } from '@/app/actions/users';
import { isSuperAdminRoleName, normalizeRoleName, resolveAccessLevel, type AccessLevel } from '@/lib/rbac';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  roles: Role[];
  permissions: Permission[];
  departmentName: string | null;
  departmentNames: string[];
  permissionsLoaded: boolean;
  accessLevel: AccessLevel;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, data: { firstName: string; lastName: string; companyName: string }) => Promise<{ error: Error | null; requiresEmailVerification?: boolean }>;
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
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [departmentNames, setDepartmentNames] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const currentPath = typeof window === 'undefined' ? '' : window.location.pathname;
    const isInvitationSetup =
      currentPath === '/auth/complete'
      || currentPath === '/setup-password'
      || currentPath === '/reset-password';
    try {
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profError) {
        console.error('[AUTH] Error fetching profile:', profError);
        return;
      }
      if (prof) {
        if (!prof.is_active) {
          if (isInvitationSetup) {
            setProfile(null);
            setCompany(null);
            setRoles([]);
            setPermissions([]);
            setDepartmentName(null);
            setDepartmentNames([]);
            return;
          }
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }

        setProfile(prof as Profile);

        const { data: departments, error: departmentsError } = prof.company_id
          ? await supabase
            .from('departments')
            .select('id, name, head_id')
            .eq('company_id', prof.company_id)
          : { data: [], error: null };
        if (departmentsError) {
          console.error('[AUTH] Error fetching assigned departments:', departmentsError);
          setDepartmentName(null);
          setDepartmentNames([]);
        } else {
          const assignedDepartments = (departments ?? []).filter(department =>
            department.id === prof.department_id || department.head_id === userId
          );
          const names = Array.from(new Set(assignedDepartments.map(department => department.name)));
          setDepartmentNames(names);
          setDepartmentName(names[0] ?? null);
        }

        if (prof.company_id) {
          const { data: comp, error: compError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', prof.company_id)
            .maybeSingle();

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
              try {
                const { syncCompanyDepartments } = await import('@/lib/departments');
                await syncCompanyDepartments(comp.id, comp.name);
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
  }, []);

  const fetchRolesAndPermissions = useCallback(async (userId: string) => {
    setPermissionsLoaded(false);
    try {
      // Fetch user's roles from user_roles table (single source of truth)
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('role_id, roles(*)')
        .eq('user_id', userId);

      if (userRolesError) {
        console.error('[AUTH] Error fetching user roles:', userRolesError);
        setRoles([]);
        setPermissions([]);
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
        console.error('[AUTH] Error fetching role permissions:', rolePermsError);
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
        console.error('[AUTH] Error fetching permissions:', permsError);
        setPermissions([]);
        return;
      }

      setPermissions(permissions || []);
    } catch (error) {
      console.error('[AUTH] Unexpected error in fetchRolesAndPermissions:', error);
      setRoles([]);
      setPermissions([]);
    } finally {
      setPermissionsLoaded(true);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchRolesAndPermissions(user.id);
    }
  }, [user, fetchProfile, fetchRolesAndPermissions]);

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
          setDepartmentName(null);
          setDepartmentNames([]);
          setPermissionsLoaded(true);
        }
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchRolesAndPermissions]);

  const activeRoleIds = roles.map(role => role.id).sort().join(',');

  useEffect(() => {
    if (!user?.id) return;

    const refreshAuthorization = () => {
      void Promise.all([
        fetchProfile(user.id),
        fetchRolesAndPermissions(user.id),
      ]);
    };

    let channel = supabase
      .channel(`authorization:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, refreshAuthorization)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles',
        filter: `user_id=eq.${user.id}`,
      }, refreshAuthorization);

    for (const roleId of activeRoleIds ? activeRoleIds.split(',') : []) {
      channel = channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'roles',
        filter: `id=eq.${roleId}`,
      }, refreshAuthorization);
      channel = channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'role_permissions',
        filter: `role_id=eq.${roleId}`,
      }, refreshAuthorization);
    }

    if (profile?.company_id) {
      channel = channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'departments',
        filter: `company_id=eq.${profile.company_id}`,
      }, refreshAuthorization);
    }

    channel = channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`[AUTH] Authorization refresh subscription failed: ${status}`);
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.company_id, activeRoleIds, fetchProfile, fetchRolesAndPermissions]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const permissionSync = await syncSuperAdminPermissions(session.access_token);
        if (!permissionSync.success) {
          await supabase.auth.signOut();
          return { error: new Error(permissionSync.error) };
        }

        await Promise.all([
          fetchProfile(session.user.id),
          fetchRolesAndPermissions(session.user.id),
        ]);

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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          company_name: data.companyName,
        },
      }
    });
      if (error) return { error: error as Error };
      if (!authData.user) return { error: new Error('No user returned from sign up') };
      const accessToken = authData.session?.access_token;
      if (!accessToken) return { error: null, requiresEmailVerification: true };
    const result = await createCompanyAccount({
      access_token: accessToken,
      first_name: data.firstName,
      last_name: data.lastName,
      company_name: data.companyName,
    });
    if (!result.success) return { error: new Error(result.error) };
    await Promise.all([fetchProfile(authData.user.id), fetchRolesAndPermissions(authData.user.id)]);
    return { error: null, requiresEmailVerification: false };
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
    setDepartmentName(null);
    setDepartmentNames([]);
    
    // Log logout event
    if (userId && companyId) {
      logAuthEvent(companyId, userId, 'logout');
    }
  };

  // Helper methods for RBAC
  const hasRole = (roleName: string): boolean => {
    return roles.some(role =>
      normalizeRoleName(role.name) === normalizeRoleName(roleName)
      || (isSuperAdminRoleName(role.name) && isSuperAdminRoleName(roleName))
    );
  };

  const accessLevel = resolveAccessLevel(roles, company?.id);
  const hasPermission = (permission: string): boolean => {
    // Permission format: resource.action (e.g., dashboard.view, hr.employees.view)
    return accessLevel === 'super_admin'
      || accessLevel === 'company_super_admin'
      || permissions.some(p => `${p.resource}.${p.action}` === permission);
  };

  const can = (resource: string, action: string): boolean => {
    return hasPermission(`${resource}.${action}`);
  };

  const isSuperAdmin = (): boolean => {
    return accessLevel === 'super_admin';
  };

  const isCompanyAdmin = (): boolean => {
    return accessLevel === 'company_super_admin' || isSuperAdmin();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      company, 
      roles, 
      permissions,
      departmentName,
      departmentNames,
      permissionsLoaded,
      accessLevel,
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
