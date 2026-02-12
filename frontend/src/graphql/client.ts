import { ApolloClient, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';
import defaultIsExtractableFile from 'extract-files/isExtractableFile.mjs';
import * as Localization from 'expo-localization';
import { Platform } from 'react-native';
import { API_URL } from '../config';
import authService from '../services/authService';

// React Native file uploads use {uri, name, type} objects instead of File/Blob
function isExtractableFile(value: unknown): value is { uri: string; name: string; type: string } {
  return defaultIsExtractableFile(value) ||
    (value != null &&
      typeof value === 'object' &&
      'uri' in value &&
      'name' in value &&
      'type' in value);
}

function formDataAppendFile(formData: FormData, fieldName: string, file: any) {
  if (Platform.OS === 'web' || file instanceof Blob) {
    formData.append(fieldName, file, file.name);
  } else {
    // React Native: pass {uri, name, type} directly — RN's FormData handles it
    formData.append(fieldName, file);
  }
}

// Create upload link to your backend (supports file uploads)
const uploadLink = new UploadHttpLink({
  uri: API_URL,
  isExtractableFile,
  formDataAppendFile,
});

// Middleware to add authentication and timezone headers to every request
const authLink = setContext(async (_, { headers }) => {
  try {
    const authData = await authService.getAuth();

    // Get device timezone (e.g., "America/New_York", "Europe/London")
    const timezone = Localization.getCalendars()[0]?.timeZone ?? 'UTC';

    if (authData) {
      console.log('Apollo: Added auth headers -', {
        familyId: authData.familyId,
        caregiverId: authData.caregiverId,
        timezone: timezone,
      });

      return {
        headers: {
          ...headers,
          'X-Family-ID': authData.familyId,
          'X-Caregiver-ID': authData.caregiverId,
          'X-Timezone': timezone,
        },
      };
    } else {
      console.log('Apollo: No auth data, adding timezone only');
      return {
        headers: {
          ...headers,
          'X-Timezone': timezone,
        }
      };
    }
  } catch (error) {
    console.warn('Apollo: Failed to read auth data, continuing without headers:', error);
    return { headers };
  }
});

// Create Apollo Client with auth middleware and upload support
export const client = new ApolloClient({
  link: authLink.concat(uploadLink),
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
