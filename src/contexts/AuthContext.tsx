import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

export interface UserProfile {
  id: string;          // backend uses 'id' (UUID)
  uid?: string;        // kept for backwards-compat
  name: string;
  email: string;
  role: 'student' | 'admin';
  department?: string;
  year?: string;
  created_at?: string;
  createdAt?: string;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'admin';
    department?: string;
    year?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);

  // On mount, restore session from stored JWT
  useEffect(() => {
    const token = localStorage.getItem('cc_token');
    if (token) {
      api.get('/api/auth/me')
        .then(({ data }) => {
          const u = data.user;
          setCurrentUser({ ...u, uid: u.id }); // keep uid alias
        })
        .catch(() => {
          localStorage.removeItem('cc_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const { data } = await api.post('/api/auth/login', { email, password: pass });
    localStorage.setItem('cc_token', data.token);
    setCurrentUser({ ...data.user, uid: data.user.id });
  };

  const register = async (formData: {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'admin';
    department?: string;
    year?: string;
  }) => {
    const { data } = await api.post('/api/auth/register', formData);
    localStorage.setItem('cc_token', data.token);
    setCurrentUser({ ...data.user, uid: data.user.id });
  };

  const logout = async () => {
    localStorage.removeItem('cc_token');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, userProfile: currentUser, loading, login, register, logout }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
