import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './AppNavigator';

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { View, TouchableOpacity } = require('react-native');
  return {
    Swipeable: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: View,
    TouchableOpacity,
    PanGestureHandler: View,
    State: {},
    Directions: {},
    gestureHandlerRootHOC: (component: unknown) => component,
  };
});

// Mock useAuth hook
const mockUseAuth = jest.fn();
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock all screen components to simple text components
jest.mock('../screens/DashboardScreen', () => ({
  DashboardScreen: () => {
    const { Text } = require('react-native');
    return <Text>Dashboard Screen</Text>;
  },
}));
jest.mock('../screens/WelcomeScreen', () => ({
  WelcomeScreen: () => {
    const { Text } = require('react-native');
    return <Text>Welcome Screen</Text>;
  },
}));
jest.mock('../screens/SignInScreen', () => ({
  SignInScreen: () => {
    const { Text } = require('react-native');
    return <Text>Sign In Screen</Text>;
  },
}));
jest.mock('../screens/SignUpScreen', () => ({
  SignUpScreen: () => {
    const { Text } = require('react-native');
    return <Text>Sign Up Screen</Text>;
  },
}));
jest.mock('../screens/CreateFamilyScreen', () => ({
  CreateFamilyScreen: () => {
    const { Text } = require('react-native');
    return <Text>Create Family Screen</Text>;
  },
}));
jest.mock('../screens/JoinFamilyScreen', () => ({
  JoinFamilyScreen: () => {
    const { Text } = require('react-native');
    return <Text>Join Family Screen</Text>;
  },
}));
jest.mock('../screens/MigrationScreen', () => ({
  MigrationScreen: () => {
    const { Text } = require('react-native');
    return <Text>Migration Screen</Text>;
  },
}));
jest.mock('../screens/SessionDetailScreen', () => ({
  SessionDetailScreen: () => null,
}));
jest.mock('../screens/PredictionDetailScreen', () => ({
  PredictionDetailScreen: () => null,
}));
jest.mock('../screens/CurrentSessionDetailScreen', () => ({
  CurrentSessionDetailScreen: () => null,
}));
jest.mock('../screens/SettingsScreen', () => ({
  SettingsScreen: () => null,
}));
jest.mock('../components/CustomHeader', () => ({
  CustomHeader: () => null,
}));

function renderNavigator() {
  return render(
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

describe('AppNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null during loading state', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      hasFamily: false,
      isLoading: true,
      supabaseSession: null,
      legacyAuthData: null,
    });

    const { toJSON } = renderNavigator();
    // NavigationContainer renders but AppNavigator returns null
    expect(toJSON()).toBeNull();
  });

  it('shows Welcome screen when unauthenticated (no Supabase, no device auth)', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      hasFamily: false,
      isLoading: false,
      supabaseSession: null,
      legacyAuthData: null,
    });

    const { getByText } = renderNavigator();
    expect(getByText('Welcome Screen')).toBeTruthy();
  });

  it('shows Migration screen when legacy device auth exists but no Supabase session', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasFamily: true,
      isLoading: false,
      supabaseSession: null,
      legacyAuthData: {
        familyId: 'f-1',
        caregiverId: 'c-1',
        caregiverName: 'Mom',
        familyName: 'Smith',
        babyName: 'Baby',
      },
    });

    const { getByText } = renderNavigator();
    expect(getByText('Migration Screen')).toBeTruthy();
  });

  it('shows Create Family screen when authenticated via Supabase but no family', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasFamily: false,
      isLoading: false,
      supabaseSession: { access_token: 'token', user: { id: 'u-1' } },
      legacyAuthData: null,
    });

    const { getByText } = renderNavigator();
    expect(getByText('Create Family Screen')).toBeTruthy();
  });

  it('shows Dashboard when fully authenticated with family', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasFamily: true,
      isLoading: false,
      supabaseSession: { access_token: 'token', user: { id: 'u-1' } },
      legacyAuthData: null,
    });

    const { getByText } = renderNavigator();
    expect(getByText('Dashboard Screen')).toBeTruthy();
  });

  it('shows Dashboard for device-auth user with family (backward compat, both auth + legacy)', () => {
    // User has both Supabase and legacy auth, with family — goes to dashboard
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasFamily: true,
      isLoading: false,
      supabaseSession: { access_token: 'token', user: { id: 'u-1' } },
      legacyAuthData: {
        familyId: 'f-1',
        caregiverId: 'c-1',
        caregiverName: 'Mom',
        familyName: 'Smith',
        babyName: 'Baby',
      },
    });

    const { getByText } = renderNavigator();
    expect(getByText('Dashboard Screen')).toBeTruthy();
  });
});
