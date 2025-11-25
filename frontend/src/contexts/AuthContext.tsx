import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          // Verify token and get user info
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`);
          console.log('AuthContext refresh - User data received:', response.data.user);
          setUser(response.data.user);
          setToken(response.data.access);
          localStorage.setItem('token', response.data.access);
        } catch (error) {
          console.error('Token verification failed:', error);
          // Token is invalid, clear it
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
      email,
      password
    });
    const { access, user: userData } = response.data;
    console.log('AuthContext login - User data received:', userData);
    setToken(access);
    setUser(userData);
    localStorage.setItem('token', access);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/signup`, {
      email,
      password,
      fullName
    });
    const { access, user: userData } = response.data;
    setToken(access);
    setUser(userData);
    localStorage.setItem('token', access);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
