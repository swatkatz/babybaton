import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { PredictionDetailScreen } from '../screens/PredictionDetailScreen';
import { CurrentSessionDetailScreen } from '../screens/CurrentSessionDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { CreateFamilyScreen } from '../screens/CreateFamilyScreen';
import { JoinFamilyScreen } from '../screens/JoinFamilyScreen';
import { MigrationScreen } from '../screens/MigrationScreen';
import { CustomHeader } from '../components/CustomHeader';
import { GetPredictionQuery } from '../types/__generated__/graphql';
import { useAuth } from '../hooks/useAuth';

// Define the route params for type safety
export type RootStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  CreateFamily: undefined;
  JoinFamily: undefined;
  Migration: undefined;
  Dashboard: undefined;
  PredictionDetail: {
    prediction: NonNullable<GetPredictionQuery['predictNextFeed']>;
  };
  CurrentSessionDetail: undefined;
  SessionDetail: { sessionId: string };
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isAuthenticated, hasFamily, isLoading, supabaseSession, legacyAuthData } = useAuth();

  console.log(
    'AppNavigator render: isLoading =',
    isLoading,
    'isAuthenticated =',
    isAuthenticated,
    'hasFamily =',
    hasFamily,
    'hasSupabase =',
    !!supabaseSession,
    'hasLegacy =',
    !!legacyAuthData
  );

  if (isLoading) {
    console.log('AppNavigator: Showing loading state...');
    return (
      <View style={splashStyles.container}>
        <Image
          source={require('../../assets/splash-icon.png')}
          style={splashStyles.icon}
          resizeMode="contain"
        />
        <ActivityIndicator testID="splash-spinner" size="small" color="#FFFFFF" style={splashStyles.spinner} />
      </View>
    );
  }

  // Determine which navigation state to show:
  // 1. Has legacy auth but no Supabase session → Migration flow
  // 2. Not authenticated at all → Auth screens (Welcome/SignIn/SignUp)
  // 3. Authenticated (Supabase) but no family → Family setup screens
  // 4. Authenticated with family → Main app screens

  const needsMigration = legacyAuthData !== null && supabaseSession === null;
  const needsFamilySetup = supabaseSession !== null && !hasFamily;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#5B9BD5',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { flex: 1 },
      }}
    >
      {needsMigration ? (
        // Migration flow: old device auth detected, prompt to create Supabase account
        <>
          <Stack.Screen
            name="Migration"
            component={MigrationScreen}
            options={{ title: 'Upgrade Account' }}
          />
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ title: 'Sign In' }}
          />
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              header: (props) => <CustomHeader {...props} />,
            }}
          />
        </>
      ) : !isAuthenticated ? (
        // Unauthenticated: show auth screens
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ title: 'Sign In' }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ title: 'Sign Up' }}
          />
          <Stack.Screen
            name="CreateFamily"
            component={CreateFamilyScreen}
            options={{ title: 'Create Family' }}
          />
          <Stack.Screen
            name="JoinFamily"
            component={JoinFamilyScreen}
            options={{ title: 'Join Family' }}
          />
        </>
      ) : needsFamilySetup ? (
        // Authenticated via Supabase but no family yet
        <>
          <Stack.Screen
            name="CreateFamily"
            component={CreateFamilyScreen}
            options={{ title: 'Create Family' }}
          />
          <Stack.Screen
            name="JoinFamily"
            component={JoinFamilyScreen}
            options={{ title: 'Join Family' }}
          />
        </>
      ) : (
        // Fully authenticated with family — main app
        <>
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              header: (props) => <CustomHeader {...props} />,
            }}
          />

          <Stack.Screen
            name="PredictionDetail"
            component={PredictionDetailScreen}
            options={{
              title: '🍼  Prediction Details',
              header: (props) => <CustomHeader {...props} />,
            }}
          />

          <Stack.Screen
            name="CurrentSessionDetail"
            component={CurrentSessionDetailScreen}
            options={{
              title: '🍼  Ongoing Session',
              header: (props) => <CustomHeader {...props} />,
            }}
          />

          <Stack.Screen
            name="SessionDetail"
            component={SessionDetailScreen}
            options={{
              title: '🍼  Session Details',
              header: (props) => <CustomHeader {...props} />,
            }}
          />

          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: '🍼  Family Settings',
              header: (props) => <CustomHeader {...props} />,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5B9BD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 120,
    height: 120,
  },
  spinner: {
    marginTop: 24,
  },
});
