import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { AuthData } from '../services/authService';

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  authData: AuthData | null;
  login: (data: AuthData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [authData, setAuthData] = useState<AuthData | null>(null);

  useEffect(() => {
    loadAuth();
  }, []);

  async function loadAuth() {
    console.log('AuthProvider: Loading auth from storage...');
    const auth = await authService.getAuth();
    console.log('AuthProvider: Loaded auth:', auth ? 'authenticated' : 'not authenticated');
    setAuthData(auth);
    setIsLoading(false);
  }

  async function login(data: AuthData) {
    console.log('AuthProvider: login called, familyId:', data.familyId);
    await authService.saveAuth(data);
    setAuthData(data);
    console.log('AuthProvider: Auth state updated, isAuthenticated:', true);
  }

  async function logout() {
    console.log('AuthProvider: logout called');
    await authService.clearAuth();
    setAuthData(null);
    console.log('AuthProvider: Auth state cleared');
  }

  const value: AuthContextType = {
    isLoading,
    isAuthenticated: authData !== null,
    authData,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
