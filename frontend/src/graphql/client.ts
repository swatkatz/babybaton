import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import authService from '../services/authService';

// Create HTTP link to your backend
const httpLink = new HttpLink({
  uri: 'http://localhost:8080/query', // Your Go backend endpoint
});

// Middleware to add authentication headers to every request
const authLink = setContext(async (_, { headers }) => {
  try {
    const authData = await authService.getAuth();

    if (authData) {
      console.log('Apollo: Added auth headers -', {
        familyId: authData.familyId,
        caregiverId: authData.caregiverId,
      });

      return {
        headers: {
          ...headers,
          'X-Family-ID': authData.familyId,
          'X-Caregiver-ID': authData.caregiverId,
        },
      };
    } else {
      console.log('Apollo: No auth data, skipping headers');
      return { headers };
    }
  } catch (error) {
    console.warn('Apollo: Failed to read auth data, continuing without headers:', error);
    return { headers };
  }
});

// Create Apollo Client with auth middleware
export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      CareSession: {
        keyFields: ['id'],
      },
      Activity: {
        keyFields: ['id'],
      },
    },
  }),
});
