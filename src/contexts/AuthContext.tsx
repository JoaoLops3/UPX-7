import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { detectLoginMode, resolveLoginEmail } from '../lib/auth';

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('invalid login') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid email or password')
  ) {
    return 'RA/e-mail ou senha incorretos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }
  return message;
}

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<string | null>;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signInWithRa: (ra: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) {
      return 'Preencha e-mail e senha.';
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (error) {
      return mapAuthError(error.message);
    }
    return null;
  }, []);

  const signInWithRa = useCallback(async (ra: string, password: string) => {
    const trimmedRa = ra.trim();
    if (!trimmedRa || !password) {
      return 'Preencha RA e senha.';
    }

    const email = await resolveLoginEmail(trimmedRa, 'ra');
    if (!email) {
      return 'RA não encontrado ou aluno inativo. Verifique com a secretaria.';
    }

    return signInWithEmail(email, password);
  }, [signInWithEmail]);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const trimmed = identifier.trim();
      if (!trimmed || !password) {
        return 'Preencha RA/e-mail e senha.';
      }

      const mode = detectLoginMode(trimmed);
      if (mode === 'email') {
        return signInWithEmail(trimmed, password);
      }

      return signInWithRa(trimmed, password);
    },
    [signInWithEmail, signInWithRa],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      signIn,
      signInWithEmail,
      signInWithRa,
      signOut,
    }),
    [session, user, loading, signIn, signInWithEmail, signInWithRa, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
