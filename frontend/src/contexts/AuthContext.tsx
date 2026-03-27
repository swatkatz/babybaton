import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import authService, { AuthData } from '../services/authService';
import { supabase } from '../services/supabase';

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  hasFamily: boolean;
  authData: AuthData | null;
  supabaseSession: Session | null;
  /** Old device-based auth data detected (migration candidate) */
  legacyAuthData: AuthData | null;
  login: (data: AuthData) => Promise<void>;
  logout: () => Promise<void>;
  /** Sign out: clears Supabase session and all local state, returns to Sign In */
  signOut: () => Promise<void>;
  /** Leave family: clears family data but keeps Supabase session, returns to Create/Join Family */
  leaveFamily: () => Promise<void>;
  clearLegacyAuth: () => Promise<void>;
  refreshFamily: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [legacyAuthData, setLegacyAuthData] = useState<AuthData | null>(null);

  useEffect(() => {
    loadAuth();

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthContext: Supabase auth state changed:', _event, session ? 'has session' : 'no session');
      setSupabaseSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadAuth() {
    console.log('AuthProvider: Loading auth from storage...');
    try {
      // Load Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      setSupabaseSession(session);

      // Load device-based auth
      const deviceAuth = await authService.getAuth();

      if (session) {
        // User has Supabase session
        if (deviceAuth) {
          // Has both: migration already done or in progress — keep legacy for potential linking
          // but treat as authenticated via Supabase
          setLegacyAuthData(deviceAuth);
          setAuthData(deviceAuth);
        }
        // If no deviceAuth, user is authenticated via Supabase but may not have a family yet
      } else if (deviceAuth) {
        // Has old device auth but no Supabase session — migration candidate
        setLegacyAuthData(deviceAuth);
        // Still treat as having auth data so the app works during migration
        setAuthData(deviceAuth);
      }
      // else: no auth at all — new user

      console.log('AuthProvider: Loaded auth:', {
        hasSupabase: !!session,
        hasDeviceAuth: !!deviceAuth,
      });
    } catch (error) {
      console.error('AuthProvider: Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
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
    await supabase.auth.signOut();
    setAuthData(null);
    setSupabaseSession(null);
    setLegacyAuthData(null);
    console.log('AuthProvider: Auth state cleared');
  }

  async function signOut() {
    console.log('AuthProvider: signOut called — clearing Supabase session and all local state');
    await authService.clearAuth();
    await supabase.auth.signOut();
    setAuthData(null);
    setSupabaseSession(null);
    setLegacyAuthData(null);
    console.log('AuthProvider: Signed out');
  }

  async function leaveFamilyAuth() {
    console.log('AuthProvider: leaveFamily called — clearing family data, keeping Supabase session');
    await authService.clearAuth();
    setAuthData(null);
    setLegacyAuthData(null);
    // Keep supabaseSession intact so user stays authenticated
    console.log('AuthProvider: Family data cleared, Supabase session retained');
  }

  async function clearLegacyAuth() {
    console.log('AuthProvider: Clearing legacy device auth');
    await authService.clearAuth();
    setLegacyAuthData(null);
  }

  const refreshFamily = useCallback(async () => {
    // Re-load device auth data to pick up family info after create/join family
    const deviceAuth = await authService.getAuth();
    if (deviceAuth) {
      setAuthData(deviceAuth);
    }
  }, []);

  // Determine authentication state:
  // - isAuthenticated: has Supabase session OR device auth (for backward compat)
  // - hasFamily: has device auth data (which means family is set up)
  const isAuthenticated = supabaseSession !== null || authData !== null;
  const hasFamily = authData !== null;

  const value: AuthContextType = {
    isLoading,
    isAuthenticated,
    hasFamily,
    authData,
    supabaseSession,
    legacyAuthData,
    login,
    logout,
    signOut,
    leaveFamily: leaveFamilyAuth,
    clearLegacyAuth,
    refreshFamily,
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
