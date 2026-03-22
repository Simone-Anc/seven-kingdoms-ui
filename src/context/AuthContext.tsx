import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, UserProfile } from '../api/gameApi';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (nickname: string, password: string) => Promise<void>;
  register: (nickname: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sk_token');
    if (token) {
      authApi.me()
        .then(profile => setUser(profile))
        .catch(() => localStorage.removeItem('sk_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (nickname: string, password: string) => {
    const res = await authApi.login(nickname, password);
    localStorage.setItem('sk_token', res.token);
    setUser(res.profile);
  };

  const register = async (nickname: string, password: string) => {
    const res = await authApi.register(nickname, password);
    localStorage.setItem('sk_token', res.token);
    setUser(res.profile);
  };

  const logout = () => {
    localStorage.removeItem('sk_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};