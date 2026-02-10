import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
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

const mockAuthData: AuthData = {
  familyId: 'family-123',
  caregiverId: 'caregiver-456',
  caregiverName: 'Jane Doe',
  familyName: 'Doe Family',
  babyName: 'Baby Doe',
};

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
      <Text testID="familyId">{auth.authData?.familyId ?? 'none'}</Text>
      <TouchableOpacity
        testID="login"
        onPress={() => auth.login(mockAuthData)}
      />
      <TouchableOpacity testID="logout" onPress={() => auth.logout()} />
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // By default, return null (not authenticated)
    (authService.getAuth as jest.Mock).mockResolvedValue(null);
    (authService.saveAuth as jest.Mock).mockResolvedValue(undefined);
    (authService.clearAuth as jest.Mock).mockResolvedValue(undefined);
  });

  it('should start in loading state', () => {
    // Make getAuth never resolve to keep loading state
    (authService.getAuth as jest.Mock).mockReturnValue(new Promise(() => {}));

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    render(
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

  it('should load existing auth from storage on mount', async () => {
    (authService.getAuth as jest.Mock).mockResolvedValue(mockAuthData);

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    render(
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
    expect(capturedAuth!.authData).toEqual(mockAuthData);
  });

  it('should set isAuthenticated to false when no auth data exists', async () => {
    (authService.getAuth as jest.Mock).mockResolvedValue(null);

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    render(
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
    expect(capturedAuth!.authData).toBeNull();
  });

  it('should save auth data and update state on login', async () => {
    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    render(
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

    // Call login
    await act(async () => {
      await capturedAuth!.login(mockAuthData);
    });

    expect(authService.saveAuth).toHaveBeenCalledWith(mockAuthData);
    expect(capturedAuth!.isAuthenticated).toBe(true);
    expect(capturedAuth!.authData).toEqual(mockAuthData);
  });

  it('should clear auth data and update state on logout', async () => {
    // Start authenticated
    (authService.getAuth as jest.Mock).mockResolvedValue(mockAuthData);

    let capturedAuth: ReturnType<typeof useAuth> | undefined;
    render(
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

    // Call logout
    await act(async () => {
      await capturedAuth!.logout();
    });

    expect(authService.clearAuth).toHaveBeenCalled();
    expect(capturedAuth!.isAuthenticated).toBe(false);
    expect(capturedAuth!.authData).toBeNull();
  });
});

describe('useAuth outside AuthProvider', () => {
  it('should throw an error when used outside AuthProvider', () => {
    // Suppress the expected error output during this test
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
