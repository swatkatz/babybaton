// App.tsx

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApolloProvider } from '@apollo/client/react';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator'; // ← Add this
import { colors } from './src/theme/colors';
import { client } from './src/graphql/client';

export default function App() {
  return (
    <ApolloProvider client={client}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={colors.background}
          />
          <AppNavigator />{' '}
        </NavigationContainer>
      </SafeAreaProvider>
    </ApolloProvider>
  );
}
