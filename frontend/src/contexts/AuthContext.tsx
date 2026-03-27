import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { useApolloClient } from '@apollo/client/react';
import authService, { AuthData } from '../services/authService';
import { supabase } from '../services/supabase';
import { GetMyFamiliesDocument, GetMyCaregiverDocument } from '../types/__generated__/graphql';

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
  const client = useApolloClient();

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

  // When Supabase session changes after initial load (e.g. sign in/out),
  // re-fetch family data from server
  useEffect(() => {
    if (supabaseSession && !isLoading) {
      fetchFamilyFromServer();
    }
  }, [supabaseSession]);

  async function fetchFamilyFromServer() {
    try {
      const { data: familiesData } = await client.query({
        query: GetMyFamiliesDocument,
        fetchPolicy: 'network-only',
      });

      const families = familiesData?.getMyFamilies;
      if (families && families.length > 0) {
        // User has a family — fetch their caregiver info
        try {
          const { data: caregiverData } = await client.query({
            query: GetMyCaregiverDocument,
            fetchPolicy: 'network-only',
          });

          const family = families[0];
          const caregiver = caregiverData?.getMyCaregiver;

          if (caregiver) {
            setAuthData({
              familyId: family.id,
              familyName: family.name,
              babyName: family.babyName,
              caregiverId: caregiver.id,
              caregiverName: caregiver.name,
            });
          } else {
            // Family exists but no caregiver resolved — set basic family data
            setAuthData({
              familyId: family.id,
              familyName: family.name,
              babyName: family.babyName,
              caregiverId: '',
              caregiverName: '',
            });
          }
        } catch (caregiverErr) {
          // Caregiver query failed — still set family data
          const family = families[0];
          setAuthData({
            familyId: family.id,
            familyName: family.name,
            babyName: family.babyName,
            caregiverId: '',
            caregiverName: '',
          });
        }
      } else {
        // User has no families
        setAuthData(null);
      }
    } catch (error) {
      console.error('AuthContext: Failed to fetch family from server:', error);
      // Don't clear authData on error — keep existing state
    }
  }

  async function loadAuth() {
    console.log('AuthProvider: Loading auth from storage...');
    try {
      // Load Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      setSupabaseSession(session);

      // Load device-based auth (for legacy/migration detection)
      const deviceAuth = await authService.getAuth();

      if (session) {
        // User has Supabase session — fetch family data before finishing load
        if (deviceAuth) {
          // Has legacy device auth — flag for migration
          setLegacyAuthData(deviceAuth);
        }
        await fetchFamilyFromServer();
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
    // For Supabase users, we don't store family data locally — it comes from the server
    if (supabaseSession) {
      setAuthData(data);
    } else {
      // Legacy device-based auth: still save to device
      await authService.saveAuth(data);
      setAuthData(data);
    }
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
    if (supabaseSession) {
      // Supabase user: refetch family data from server
      await fetchFamilyFromServer();
    } else {
      // Legacy: re-load device auth data
      const deviceAuth = await authService.getAuth();
      if (deviceAuth) {
        setAuthData(deviceAuth);
      }
    }
  }, [supabaseSession, client]);

  // Determine authentication state:
  // - isAuthenticated: has Supabase session OR device auth (for backward compat)
  // - hasFamily: has auth data (which means family is set up)
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
