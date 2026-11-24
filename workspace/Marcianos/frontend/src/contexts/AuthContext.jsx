import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Entrada sem senha só existe rodando localmente (npm run dev); o Vite remove isto do build publicado
const DEV_SESSION_KEY = 'marcianos_dev_admin';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDevSession, setIsDevSession] = useState(false);

  useEffect(() => {
    // A sessão antiga do login simulado não vale mais nada
    localStorage.removeItem('admin_user');

    if (import.meta.env.DEV && sessionStorage.getItem(DEV_SESSION_KEY)) {
      setUser({ email: 'desenvolvimento@local' });
      setIsDevSession(true);
      setLoading(false);
      return undefined;
    }

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!sessionStorage.getItem(DEV_SESSION_KEY)) setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  /** Entra com e-mail e senha do Supabase. Devolve uma mensagem de erro em português, ou null. */
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message?.toLowerCase().includes('invalid login')) return 'E-mail ou senha incorretos.';
      if (error.message?.toLowerCase().includes('email not confirmed')) return 'Confirme o e-mail antes de entrar.';
      return 'Não foi possível entrar agora. Verifique a internet e tente de novo.';
    }
    setUser(data.user);
    return null;
  };

  const loginDev = () => {
    if (!import.meta.env.DEV) return;
    sessionStorage.setItem(DEV_SESSION_KEY, '1');
    setIsDevSession(true);
    setUser({ email: 'desenvolvimento@local' });
  };

  const logout = async () => {
    sessionStorage.removeItem(DEV_SESSION_KEY);
    setIsDevSession(false);
    setUser(null);
    await supabase.auth.signOut().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDevSession, login, loginDev, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
}
