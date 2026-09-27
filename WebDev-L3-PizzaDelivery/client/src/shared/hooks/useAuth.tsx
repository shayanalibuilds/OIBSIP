import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiAuth, type UserPublic, tokenStore } from '../lib/api';

interface AuthContextValue {
  user: UserPublic | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserPublic>;
  adminLogin: (email: string, password: string) => Promise<UserPublic>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    if (!tokenStore.getAccess()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const out = await apiAuth.me();
      setUser(out.user);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMe();
  }, []);

  const login = async (email: string, password: string) => {
    const out = await apiAuth.login({ email, password });
    tokenStore.set(out.accessToken, out.refreshToken);
    setUser(out.user);
    return out.user;
  };

  const adminLogin = async (email: string, password: string) => {
    const out = await apiAuth.adminLogin({ email, password });
    tokenStore.set(out.accessToken, out.refreshToken);
    setUser(out.user);
    return out.user;
  };

  const logout = async () => {
    const refresh = tokenStore.getRefresh();
    if (refresh) {
      try {
        await apiAuth.logout({ refreshToken: refresh });
      } catch {
        /* ignore */
      }
    }
    tokenStore.clear();
    setUser(null);
  };

  const refresh = async () => {
    await loadMe();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, adminLogin, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
