import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Home, Clock, User } from 'lucide-react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CurrentSessionDetailScreen } from '../screens/CurrentSessionDetailScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { LogActivityScreen } from '../screens/LogActivityScreen';
import { UpcomingScreen } from '../screens/UpcomingScreen';
import { PredictionDetailScreen } from '../screens/PredictionDetailScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CustomHeader } from '../components/CustomHeader';
import { colors } from '../theme/colors';

export type HomeStackParamList = {
  Dashboard: undefined;
  CurrentSessionDetail: undefined;
  SessionDetail: { sessionId: string };
  LogActivity: undefined;
  Upcoming: undefined;
  PredictionDetail: { predictionId: string };
};

export type HistoryStackParamList = {
  HistoryHome: undefined;
  SessionDetail: { sessionId: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const HistoryStack = createStackNavigator<HistoryStackParamList>();

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
      <HomeStack.Screen
        name="PredictionDetail"
        component={PredictionDetailScreen}
        options={{
          title: 'Prediction',
          header: (props) => <CustomHeader {...props} />,
        }}
      />
    </HomeStack.Navigator>
  );
}

function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator>
      <HistoryStack.Screen
        name="HistoryHome"
        component={HistoryScreen}
        options={{
          title: 'History',
          header: (props) => <CustomHeader {...props} />,
        }}
      />
      <HistoryStack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{
          title: 'Session Details',
          header: (props) => <CustomHeader {...props} />,
        }}
      />
    </HistoryStack.Navigator>
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
        component={HistoryStackNavigator}
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
