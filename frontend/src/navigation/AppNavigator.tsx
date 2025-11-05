import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '../screens/DashboardScreen';

// Define the route params for type safety
export type RootStackParamList = {
  Dashboard: undefined;
  PredictionDetail: undefined;
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
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: '🍼 Baby Baton' }}
      />
    </Stack.Navigator>
  );
}
