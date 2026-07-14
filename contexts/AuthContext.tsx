'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, Company } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, data: { firstName: string; lastName: string; companyName: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
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

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      (async () => {
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setCompany(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    data: { firstName: string; lastName: string; companyName: string }
  ) => {
    const { data: authData, error } = await supabase.auth.signUp({ email, password });
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
        role: 'admin',
      });

      // Seed demo data in background
      try {
        const { seedDemoData } = await import('@/lib/seed');
        await seedDemoData(companyData.id);
      } catch { /* non-critical */ }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, company, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
