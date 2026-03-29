import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Home, Clock, User } from 'lucide-react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PredictionDetailScreen } from '../screens/PredictionDetailScreen';
import { CurrentSessionDetailScreen } from '../screens/CurrentSessionDetailScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { LogActivityScreen } from '../screens/LogActivityScreen';
import { UpcomingScreen } from '../screens/UpcomingScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CustomHeader } from '../components/CustomHeader';
import { GetPredictionQuery } from '../types/__generated__/graphql';
import { colors } from '../theme/colors';

export type HomeStackParamList = {
  Dashboard: undefined;
  PredictionDetail: {
    prediction: NonNullable<GetPredictionQuery['predictNextFeed']>;
  };
  CurrentSessionDetail: undefined;
  SessionDetail: { sessionId: string };
  LogActivity: undefined;
  Upcoming: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          header: (props) => <CustomHeader {...props} />,
        }}
      />
      <HomeStack.Screen
        name="PredictionDetail"
        component={PredictionDetailScreen}
        options={{
          title: 'Prediction Details',
          header: (props) => <CustomHeader {...props} />,
        }}
      />
      <HomeStack.Screen
        name="CurrentSessionDetail"
        component={CurrentSessionDetailScreen}
        options={{
          title: 'Ongoing Session',
          header: (props) => <CustomHeader {...props} />,
        }}
      />
      <HomeStack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{
          title: 'Session Details',
          header: (props) => <CustomHeader {...props} />,
        }}
      />
      <HomeStack.Screen
        name="LogActivity"
        component={LogActivityScreen}
        options={{
          title: 'Log Activity',
          header: (props) => <CustomHeader {...props} />,
        }}
      />
      <HomeStack.Screen
        name="Upcoming"
        component={UpcomingScreen}
        options={{
          title: 'Upcoming',
          header: (props) => <CustomHeader {...props} />,
        }}
      />
    </HomeStack.Navigator>
  );
}

const TAB_ICON_SIZE = 24;

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ color }) => (
            <Home size={TAB_ICON_SIZE} color={color} />
          ),
          tabBarAccessibilityLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Clock size={TAB_ICON_SIZE} color={color} />
          ),
          tabBarAccessibilityLabel: 'History',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <User size={TAB_ICON_SIZE} color={color} />
          ),
          tabBarAccessibilityLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}
