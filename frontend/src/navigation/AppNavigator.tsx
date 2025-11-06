import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { PredictionDetailScreen } from '../screens/PredictionDetailScreen';
import { CurrentSessionDetailScreen } from '../screens/CurrentSessionDetailScreen';
import { GetPredictionQuery } from '../generated/graphql';

// Define the route params for type safety
export type RootStackParamList = {
  Dashboard: undefined;
  PredictionDetail: { prediction: NonNullable<GetPredictionQuery['predictNextFeed']> };
  CurrentSessionDetail: undefined;
  SessionDetail: { sessionId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export function AppNavigator() {
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
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: '🍼 Baby Baton' }}
      />

      <Stack.Screen
        name="PredictionDetail"
        component={PredictionDetailScreen}
        options={{ title: 'Prediction Details' }}
      />

      <Stack.Screen
        name="CurrentSessionDetail"
        component={CurrentSessionDetailScreen}
        options={{ title: 'Current Session' }}
      />

      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: 'Session Details' }}
      />
    </Stack.Navigator>
  );
}
