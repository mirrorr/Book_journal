import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import { DATA_MODE } from '../services/db';

interface AuthContextValue {
  /** False in local mode: the whole auth layer is bypassed. */
  authEnabled: boolean;
  /** True while the initial session is being restored from storage. */
  initializing: boolean;
  user: User | null;
  signIn(email: string, password: string): Promise<void>;
  /** Resolves with whether the user still has to confirm their email. */
  signUp(email: string, password: string): Promise<{ needsEmailConfirmation: boolean }>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_ENABLED = DATA_MODE === 'supabase';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(AUTH_ENABLED);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    // When "Confirm email" is enabled in Supabase, signUp returns no session
    // until the user clicks the link in their inbox.
    return { needsEmailConfirmation: data.session === null };
  };

  const signOut = async () => {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider
      value={{ authEnabled: AUTH_ENABLED, initializing, user, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
