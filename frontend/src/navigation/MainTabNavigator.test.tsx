import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MainTabNavigator } from './MainTabNavigator';

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
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    authData: {
      familyId: 'f-1',
      caregiverId: 'c-1',
      caregiverName: 'Mom',
      familyName: 'Smith',
      babyName: 'Baby',
    },
    isAuthenticated: true,
    hasFamily: true,
    isLoading: false,
    supabaseSession: { access_token: 'token', user: { id: 'u-1' } },
    legacyAuthData: null,
  }),
}));

// Mock screen components
jest.mock('../screens/DashboardScreen', () => ({
  DashboardScreen: () => {
    const { Text } = require('react-native');
    return <Text>Dashboard Screen</Text>;
  },
}));
jest.mock('../screens/HistoryScreen', () => ({
  HistoryScreen: () => {
    const { Text } = require('react-native');
    return <Text>History Screen</Text>;
  },
}));
jest.mock('../screens/SettingsScreen', () => ({
  SettingsScreen: () => {
    const { Text } = require('react-native');
    return <Text>Settings Screen</Text>;
  },
}));
jest.mock('../screens/PredictionDetailScreen', () => ({
  PredictionDetailScreen: () => null,
}));
jest.mock('../screens/CurrentSessionDetailScreen', () => ({
  CurrentSessionDetailScreen: () => null,
}));
jest.mock('../screens/SessionDetailScreen', () => ({
  SessionDetailScreen: () => null,
}));
jest.mock('../screens/LogActivityScreen', () => ({
  LogActivityScreen: () => null,
}));
jest.mock('../screens/UpcomingScreen', () => ({
  UpcomingScreen: () => null,
}));
jest.mock('../components/CustomHeader', () => ({
  CustomHeader: () => null,
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    Home: (props: Record<string, unknown>) => <View testID="icon-home" {...props} />,
    Clock: (props: Record<string, unknown>) => <View testID="icon-clock" {...props} />,
    User: (props: Record<string, unknown>) => <View testID="icon-user" {...props} />,
  };
});

function renderTabs() {
  return render(
    <NavigationContainer>
      <MainTabNavigator />
    </NavigationContainer>
  );
}

describe('MainTabNavigator', () => {
  it('renders Home tab with DashboardScreen by default', () => {
    const { getByText } = renderTabs();
    expect(getByText('Dashboard Screen')).toBeTruthy();
  });

  it('renders History tab content when History tab pressed', () => {
    const { getByText, getByLabelText } = renderTabs();
    fireEvent.press(getByLabelText('History'));
    expect(getByText('History Screen')).toBeTruthy();
  });

  it('renders Profile tab with SettingsScreen when Profile tab pressed', () => {
    const { getByText, getByLabelText } = renderTabs();
    fireEvent.press(getByLabelText('Profile'));
    expect(getByText('Settings Screen')).toBeTruthy();
  });

  it('renders three tab icons', () => {
    const { getAllByTestId } = renderTabs();
    expect(getAllByTestId('icon-home').length).toBeGreaterThan(0);
    expect(getAllByTestId('icon-clock').length).toBeGreaterThan(0);
    expect(getAllByTestId('icon-user').length).toBeGreaterThan(0);
  });
});
