'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { authApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: 'mentor' | 'mentee') => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await authApi.getMe();
          if (response.success && response.data) {
            setUser(response.data);
          }
        } catch (error) {
          console.error('Failed to get user info:', error);
          localStorage.removeItem('authToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      if (response.success && response.data) {
        localStorage.setItem('authToken', response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error(response.error || '로그인에 실패했습니다.');
      }
    } catch (error) {
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string, role: 'mentor' | 'mentee') => {
    try {
      const response = await authApi.signup({ name, email, password, role });
      if (response.success && response.data) {
        localStorage.setItem('authToken', response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error(response.error || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
