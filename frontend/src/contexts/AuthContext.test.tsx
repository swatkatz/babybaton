import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { ApolloClient, InMemoryCache, ApolloLink, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { AuthProvider, useAuth } from './AuthContext';
import authService, { AuthData } from '../services/authService';

// Mock the authService module
jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    getAuth: jest.fn(),
    saveAuth: jest.fn(),
    clearAuth: jest.fn(),
  },
}));

// Mock Supabase
const mockGetSession = jest.fn();
const mockSignOut = jest.fn();
const mockOnAuthStateChange = jest.fn();
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

const mockAuthData: AuthData = {
  familyId: 'family-123',
  caregiverId: 'caregiver-456',
  caregiverName: 'Jane Doe',
  familyName: 'Doe Family',
  babyName: 'Baby Doe',
};

const mockSupabaseSession = {
  access_token: 'test-token',
  refresh_token: 'test-refresh',
  user: { id: 'user-1', email: 'test@example.com' },
};

// Create a mock Apollo client for tests
function createMockApolloClient() {
  // Mock link that returns errors — auth context handles query errors gracefully
  const mockLink = new ApolloLink(() => {
    return new Observable((observer) => {
      observer.error(new Error('No network in tests'));
    });
  });
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: mockLink,
  });
}

// A test consumer component that exposes auth context values
function TestConsumer({
  onRender,
}: {
  onRender: (ctx: ReturnType<typeof useAuth>) => void;
}) {
  const auth = useAuth();
  onRender(auth);
  return (
    <>
      <Text testID="loading">{String(auth.isLoading)}</Text>
      <Text testID="authenticated">{String(auth.isAuthenticated)}</Text>
      <Text testID="hasFamily">{String(auth.hasFamily)}</Text>
      <Text testID="familyId">{auth.authData?.familyId ?? 'none'}</Text>
      <Text testID="hasLegacy">{String(auth.legacyAuthData !== null)}</Text>
      <Text testID="hasSupabase">{String(auth.supabaseSession !== null)}</Text>
      <TouchableOpacity
        testID="login"
        onPress={() => auth.login(mockAuthData)}
      />
      <TouchableOpacity testID="logout" onPress={() => auth.logout()} />
      <TouchableOpacity testID="signOut" onPress={() => auth.signOut()} />
      <TouchableOpacity testID="leaveFamily" onPress={() => auth.leaveFamily()} />
      <TouchableOpacity testID="clearLegacy" onPress={() => auth.clearLegacyAuth()} />
    </>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  const client = createMockApolloClient();
  return render(
    <ApolloProvider client={client}>
      {ui}
    </ApolloProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no auth of any kind
    (authService.getAuth as jest.Mock).mockResolvedValue(null);
    (authService.saveAuth as jest.Mock).mockResolvedValue(undefined);
    (authService.clearAuth as jest.Mock).mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignOut.mockResolvedValue({ error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('should start in loading state', () => {
    // Make getSession never resolve to keep loading state
    mockGetSession.mockReturnValue(new Promise(() => {}));

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    expect(capturedAuth!.isLoading).toBe(true);
    expect(capturedAuth!.isAuthenticated).toBe(false);
  });

  it('should be unauthenticated when no auth exists', async () => {
    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.isLoading).toBe(false);
    });

    expect(capturedAuth!.isAuthenticated).toBe(false);
    expect(capturedAuth!.hasFamily).toBe(false);
    expect(capturedAuth!.supabaseSession).toBeNull();
    expect(capturedAuth!.legacyAuthData).toBeNull();
  });

  it('should detect legacy device auth as migration candidate', async () => {
    (authService.getAuth as jest.Mock).mockResolvedValue(mockAuthData);
    // No Supabase session
    mockGetSession.mockResolvedValue({ data: { session: null } });

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.isLoading).toBe(false);
    });

    expect(capturedAuth!.isAuthenticated).toBe(true);
    expect(capturedAuth!.hasFamily).toBe(true);
    expect(capturedAuth!.legacyAuthData).toEqual(mockAuthData);
    expect(capturedAuth!.supabaseSession).toBeNull();
  });

  it('should be authenticated with Supabase session and detect legacy auth', async () => {
    (authService.getAuth as jest.Mock).mockResolvedValue(mockAuthData);
    mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession } });

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.isLoading).toBe(false);
    });

    expect(capturedAuth!.isAuthenticated).toBe(true);
    expect(capturedAuth!.supabaseSession).toBeTruthy();
    expect(capturedAuth!.legacyAuthData).toEqual(mockAuthData);
  });

  it('should be authenticated via Supabase without family', async () => {
    // Supabase session but no device auth (new user who signed up)
    mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession } });
    (authService.getAuth as jest.Mock).mockResolvedValue(null);

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.isLoading).toBe(false);
    });

    expect(capturedAuth!.isAuthenticated).toBe(true);
    // hasFamily may be false initially until server query resolves
    // (server query will fail in test since no link, so stays false)
    expect(capturedAuth!.supabaseSession).toBeTruthy();
  });

  it('should save auth data and update state on login (legacy path)', async () => {
    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.isLoading).toBe(false);
    });

    await act(async () => {
      await capturedAuth!.login(mockAuthData);
    });

    // No Supabase session, so login saves to device
    expect(authService.saveAuth).toHaveBeenCalledWith(mockAuthData);
    expect(capturedAuth!.isAuthenticated).toBe(true);
    expect(capturedAuth!.hasFamily).toBe(true);
    expect(capturedAuth!.authData).toEqual(mockAuthData);
  });

  it('should clear all auth data on logout', async () => {
    (authService.getAuth as jest.Mock).mockResolvedValue(mockAuthData);
    mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession } });

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await capturedAuth!.logout();
    });

    expect(authService.clearAuth).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
    expect(capturedAuth!.isAuthenticated).toBe(false);
    expect(capturedAuth!.hasFamily).toBe(false);
    expect(capturedAuth!.supabaseSession).toBeNull();
    expect(capturedAuth!.legacyAuthData).toBeNull();
  });

  it('should clear legacy auth without affecting Supabase session', async () => {
    (authService.getAuth as jest.Mock).mockResolvedValue(mockAuthData);
    mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession } });

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.isLoading).toBe(false);
    });

    await act(async () => {
      await capturedAuth!.clearLegacyAuth();
    });

    expect(authService.clearAuth).toHaveBeenCalled();
    expect(capturedAuth!.legacyAuthData).toBeNull();
    // Supabase session should still be there
    expect(capturedAuth!.supabaseSession).toBeTruthy();
  });

  it('should clear all state on signOut (same as logout)', async () => {
    (authService.getAuth as jest.Mock).mockResolvedValue(mockAuthData);
    mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession } });

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await capturedAuth!.signOut();
    });

    expect(authService.clearAuth).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
    expect(capturedAuth!.isAuthenticated).toBe(false);
    expect(capturedAuth!.hasFamily).toBe(false);
    expect(capturedAuth!.supabaseSession).toBeNull();
    expect(capturedAuth!.legacyAuthData).toBeNull();
  });

  it('should clear family data but keep Supabase session on leaveFamily', async () => {
    (authService.getAuth as jest.Mock).mockResolvedValue(mockAuthData);
    mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession } });

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await capturedAuth!.leaveFamily();
    });

    expect(authService.clearAuth).toHaveBeenCalled();
    // Supabase session should be retained
    expect(capturedAuth!.supabaseSession).toBeTruthy();
    // But family data should be cleared
    expect(capturedAuth!.hasFamily).toBe(false);
    expect(capturedAuth!.authData).toBeNull();
    expect(capturedAuth!.legacyAuthData).toBeNull();
    // Still authenticated via Supabase
    expect(capturedAuth!.isAuthenticated).toBe(true);
    // signOut should NOT have been called on Supabase
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('should listen for Supabase auth state changes', async () => {
    let authChangeCallback: (event: string, session: unknown) => void;
    mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
      authChangeCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    renderWithProviders(
      <AuthProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedAuth = ctx;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedAuth!.isLoading).toBe(false);
    });

    expect(capturedAuth!.supabaseSession).toBeNull();

    // Simulate Supabase auth change
    act(() => {
      authChangeCallback!('SIGNED_IN', mockSupabaseSession);
    });

    expect(capturedAuth!.supabaseSession).toEqual(mockSupabaseSession);
  });
});

describe('useAuth outside AuthProvider', () => {
  it('should throw an error when used outside AuthProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      useAuth();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );

    consoleSpy.mockRestore();
  });
});
