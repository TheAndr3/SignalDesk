import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  FC,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const currentUserIdRef = useRef<string | null>(null);

  const applySession = useCallback(
    (nextSession: Session | null) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (currentUserIdRef.current !== nextUserId) {
        queryClient.clear();
        currentUserIdRef.current = nextUserId;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    },
    [queryClient],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = async () => {
    queryClient.clear();
    currentUserIdRef.current = null;
    await supabase.auth.signOut();
    applySession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
