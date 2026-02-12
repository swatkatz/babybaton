import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { PredictionDetailScreen } from '../screens/PredictionDetailScreen';
import { CurrentSessionDetailScreen } from '../screens/CurrentSessionDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { CreateFamilyScreen } from '../screens/CreateFamilyScreen';
import { JoinFamilyScreen } from '../screens/JoinFamilyScreen';
import { CustomHeader } from '../components/CustomHeader';
import { GetPredictionQuery } from '../types/__generated__/graphql';
import { useAuth } from '../hooks/useAuth';

// Define the route params for type safety
export type RootStackParamList = {
  Welcome: undefined;
  CreateFamily: undefined;
  JoinFamily: undefined;
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
  const { isAuthenticated, isLoading } = useAuth();

  console.log(
    'AppNavigator render: isLoading =',
    isLoading,
    'isAuthenticated =',
    isAuthenticated
  );

  if (isLoading) {
    console.log('AppNavigator: Showing loading state...');
    // Could return a loading screen here if desired
    return null;
  }

  console.log(
    'AppNavigator: Rendering',
    isAuthenticated ? 'authenticated' : 'unauthenticated',
    'screens'
  );

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
      {!isAuthenticated ? (
        // Auth screens
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
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
      ) : (
        // Main app screens
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
