import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// Create HTTP link to your backend
const httpLink = new HttpLink({
  uri: 'http://localhost:8080/query', // Your Go backend endpoint
});

// Create Apollo Client
export const client = new ApolloClient({
  link: httpLink,
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
