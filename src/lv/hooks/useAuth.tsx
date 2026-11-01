// @ts-nocheck
'use client';
/* Login: o mesmo do painel (Supabase + 2 etapas). */
import { useEffect, useState, type ReactNode } from 'react';
import { sb } from '@/lib/supabase/browser';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    sb()
      .auth.getSession()
      .then(({ data }) => (setSession(data.session), setLoading(false)));
  }, []);
  return {
    session,
    user: session?.user ?? null,
    isAdmin: !!session,
    loading,
    adminChecked: !loading,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {
      await sb().auth.signOut();
    },
  };
}
