import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  updateProfile: (data: { fullName?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  generateOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error?.response?.status === 401) {
          await SecureStore.deleteItemAsync('auth_token');
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const response = await api.get('/verify-session');
        if (response.data?.user) {
          setUser(response.data.user);
        } else {
          await SecureStore.deleteItemAsync('auth_token');
          setUser(null);
        }
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/creduser/login', { email, password });
    if (response.data?.token) {
      await SecureStore.setItemAsync('auth_token', response.data.token);
      setUser(response.data.user);
    }
  };

  const register = async (data: RegisterData) => {
    const response = await api.post('/creduser/register', data);
    if (response.data?.token) {
      await SecureStore.setItemAsync('auth_token', response.data.token);
      setUser(response.data.user);
    }
  };

  const googleLogin = async (idToken: string) => {
    const response = await api.post('/creduser/google', { idToken });
    if (response.data?.token) {
      await SecureStore.setItemAsync('auth_token', response.data.token);
      setUser(response.data.user);
    }
  };

  const updateProfile = async (data: { fullName?: string; phone?: string }) => {
    const response = await api.patch('/creduser/profile', data);
    if (response.data?.user) {
      setUser(response.data.user);
    }
  };

  const logout = async () => {
    try {
      await api.post('/creduser/logout');
    } finally {
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
    }
  };

  const generateOtp = async (email: string) => {
    await api.post('/user/generate-otp', { email });
  };

  const verifyOtp = async (email: string, otp: string) => {
    await api.post('/user/verify-otp', { email, otp });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        googleLogin,
        updateProfile,
        logout,
        generateOtp,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
