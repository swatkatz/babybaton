import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@apollo/client/react';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
};

export type Activity = DiaperActivity | FeedActivity | SleepActivity;

export type ActivityInput = {
  activityType: ActivityType;
  diaperDetails?: InputMaybe<DiaperDetailsInput>;
  feedDetails?: InputMaybe<FeedDetailsInput>;
  sleepDetails?: InputMaybe<SleepDetailsInput>;
};

export enum ActivityType {
  Diaper = 'DIAPER',
  Feed = 'FEED',
  Sleep = 'SLEEP'
}

export type AuthResult = {
  __typename?: 'AuthResult';
  caregiver?: Maybe<Caregiver>;
  error?: Maybe<Scalars['String']['output']>;
  family?: Maybe<Family>;
  success: Scalars['Boolean']['output'];
};

export type CareSession = {
  __typename?: 'CareSession';
  activities: Array<Activity>;
  caregiver: Caregiver;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  familyId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  startedAt: Scalars['DateTime']['output'];
  status: CareSessionStatus;
  summary: CareSessionSummary;
};

export enum CareSessionStatus {
  Completed = 'COMPLETED',
  InProgress = 'IN_PROGRESS'
}

export type CareSessionSummary = {
  __typename?: 'CareSessionSummary';
  currentlyAsleep: Scalars['Boolean']['output'];
  lastFeedTime?: Maybe<Scalars['DateTime']['output']>;
  lastSleepTime?: Maybe<Scalars['DateTime']['output']>;
  totalDiaperChanges: Scalars['Int']['output'];
  totalFeeds: Scalars['Int']['output'];
  totalMl: Scalars['Int']['output'];
  totalSleepMinutes: Scalars['Int']['output'];
};

export type Caregiver = {
  __typename?: 'Caregiver';
  createdAt: Scalars['DateTime']['output'];
  deviceId: Scalars['String']['output'];
  deviceName?: Maybe<Scalars['String']['output']>;
  familyId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type DiaperActivity = {
  __typename?: 'DiaperActivity';
  activityType: ActivityType;
  createdAt: Scalars['DateTime']['output'];
  diaperDetails?: Maybe<DiaperDetails>;
  id: Scalars['ID']['output'];
};

export type DiaperDetails = {
  __typename?: 'DiaperDetails';
  changedAt: Scalars['DateTime']['output'];
  hadPee: Scalars['Boolean']['output'];
  hadPoop: Scalars['Boolean']['output'];
};

export type DiaperDetailsInput = {
  changedAt: Scalars['DateTime']['input'];
  hadPee?: InputMaybe<Scalars['Boolean']['input']>;
  hadPoop: Scalars['Boolean']['input'];
};

export type Family = {
  __typename?: 'Family';
  babyName: Scalars['String']['output'];
  caregivers: Array<Caregiver>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  password: Scalars['String']['output'];
};

export type FeedActivity = {
  __typename?: 'FeedActivity';
  activityType: ActivityType;
  createdAt: Scalars['DateTime']['output'];
  feedDetails?: Maybe<FeedDetails>;
  id: Scalars['ID']['output'];
};

export type FeedDetails = {
  __typename?: 'FeedDetails';
  amountMl?: Maybe<Scalars['Int']['output']>;
  durationMinutes?: Maybe<Scalars['Int']['output']>;
  endTime?: Maybe<Scalars['DateTime']['output']>;
  feedType?: Maybe<FeedType>;
  startTime: Scalars['DateTime']['output'];
};

export type FeedDetailsInput = {
  amountMl?: InputMaybe<Scalars['Int']['input']>;
  endTime?: InputMaybe<Scalars['DateTime']['input']>;
  feedType?: InputMaybe<FeedType>;
  startTime: Scalars['DateTime']['input'];
};

export enum FeedType {
  BreastMilk = 'BREAST_MILK',
  Formula = 'FORMULA'
}

export type Mutation = {
  __typename?: 'Mutation';
  addActivities: CareSession;
  completeCareSession: CareSession;
  createFamily: AuthResult;
  deleteActivity: Scalars['Boolean']['output'];
  endActivity: Activity;
  joinFamily: AuthResult;
  leaveFamily: Scalars['Boolean']['output'];
  parseVoiceInput: ParsedVoiceResult;
  startCareSession: CareSession;
  updateBabyName: Family;
};


export type MutationAddActivitiesArgs = {
  activities: Array<ActivityInput>;
};


export type MutationCompleteCareSessionArgs = {
  notes?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateFamilyArgs = {
  babyName: Scalars['String']['input'];
  caregiverName: Scalars['String']['input'];
  deviceId: Scalars['String']['input'];
  deviceName?: InputMaybe<Scalars['String']['input']>;
  familyName: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationDeleteActivityArgs = {
  activityId: Scalars['ID']['input'];
};


export type MutationEndActivityArgs = {
  activityId: Scalars['ID']['input'];
  endTime?: InputMaybe<Scalars['DateTime']['input']>;
};


export type MutationJoinFamilyArgs = {
  caregiverName: Scalars['String']['input'];
  deviceId: Scalars['String']['input'];
  deviceName?: InputMaybe<Scalars['String']['input']>;
  familyName: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationParseVoiceInputArgs = {
  text: Scalars['String']['input'];
};


export type MutationUpdateBabyNameArgs = {
  babyName: Scalars['String']['input'];
};

export type NextFeedPrediction = {
  __typename?: 'NextFeedPrediction';
  confidence: PredictionConfidence;
  minutesUntilFeed: Scalars['Int']['output'];
  predictedTime: Scalars['DateTime']['output'];
  reasoning?: Maybe<Scalars['String']['output']>;
};

export type ParsedActivity = {
  __typename?: 'ParsedActivity';
  activityType: ActivityType;
  diaperDetails?: Maybe<DiaperDetails>;
  feedDetails?: Maybe<FeedDetails>;
  sleepDetails?: Maybe<SleepDetails>;
};

export type ParsedVoiceResult = {
  __typename?: 'ParsedVoiceResult';
  errors?: Maybe<Array<Scalars['String']['output']>>;
  parsedActivities: Array<ParsedActivity>;
  rawText: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export enum PredictionConfidence {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export type Query = {
  __typename?: 'Query';
  checkFamilyNameAvailable: Scalars['Boolean']['output'];
  getCareSession?: Maybe<CareSession>;
  getCurrentSession?: Maybe<CareSession>;
  getMyCaregiver?: Maybe<Caregiver>;
  getMyFamily?: Maybe<Family>;
  getRecentCareSessions: Array<CareSession>;
  predictNextFeed: NextFeedPrediction;
};


export type QueryCheckFamilyNameAvailableArgs = {
  name: Scalars['String']['input'];
};


export type QueryGetCareSessionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetRecentCareSessionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type SleepActivity = {
  __typename?: 'SleepActivity';
  activityType: ActivityType;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  sleepDetails?: Maybe<SleepDetails>;
};

export type SleepDetails = {
  __typename?: 'SleepDetails';
  durationMinutes?: Maybe<Scalars['Int']['output']>;
  endTime?: Maybe<Scalars['DateTime']['output']>;
  isActive?: Maybe<Scalars['Boolean']['output']>;
  startTime: Scalars['DateTime']['output'];
};

export type SleepDetailsInput = {
  endTime?: InputMaybe<Scalars['DateTime']['input']>;
  startTime: Scalars['DateTime']['input'];
};

export type CreateFamilyMutationVariables = Exact<{
  familyName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  babyName: Scalars['String']['input'];
  caregiverName: Scalars['String']['input'];
  deviceId: Scalars['String']['input'];
  deviceName?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateFamilyMutation = { __typename?: 'Mutation', createFamily: { __typename?: 'AuthResult', success: boolean, error?: string | null, family?: { __typename?: 'Family', id: string, name: string, babyName: string, createdAt: string } | null, caregiver?: { __typename?: 'Caregiver', id: string, name: string, deviceId: string, familyId: string } | null } };

export type JoinFamilyMutationVariables = Exact<{
  familyName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  caregiverName: Scalars['String']['input'];
  deviceId: Scalars['String']['input'];
  deviceName?: InputMaybe<Scalars['String']['input']>;
}>;


export type JoinFamilyMutation = { __typename?: 'Mutation', joinFamily: { __typename?: 'AuthResult', success: boolean, error?: string | null, family?: { __typename?: 'Family', id: string, name: string, babyName: string, createdAt: string } | null, caregiver?: { __typename?: 'Caregiver', id: string, name: string, deviceId: string, familyId: string } | null } };

export type CheckFamilyNameAvailableQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type CheckFamilyNameAvailableQuery = { __typename?: 'Query', checkFamilyNameAvailable: boolean };

export type ParseVoiceInputMutationVariables = Exact<{
  text: Scalars['String']['input'];
}>;


export type ParseVoiceInputMutation = { __typename?: 'Mutation', parseVoiceInput: { __typename?: 'ParsedVoiceResult', success: boolean, errors?: Array<string> | null, rawText: string, parsedActivities: Array<{ __typename?: 'ParsedActivity', activityType: ActivityType, feedDetails?: { __typename?: 'FeedDetails', startTime: string, endTime?: string | null, amountMl?: number | null, feedType?: FeedType | null, durationMinutes?: number | null } | null, diaperDetails?: { __typename?: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null, sleepDetails?: { __typename?: 'SleepDetails', startTime: string, endTime?: string | null, durationMinutes?: number | null, isActive?: boolean | null } | null }> } };

export type GetPredictionQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPredictionQuery = { __typename?: 'Query', predictNextFeed: { __typename?: 'NextFeedPrediction', predictedTime: string, confidence: PredictionConfidence, minutesUntilFeed: number, reasoning?: string | null } };

export type GetCurrentSessionQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentSessionQuery = { __typename?: 'Query', getCurrentSession?: { __typename?: 'CareSession', id: string, status: CareSessionStatus, startedAt: string, completedAt?: string | null, notes?: string | null, caregiver: { __typename?: 'Caregiver', id: string, name: string, deviceId: string, deviceName?: string | null }, activities: Array<
      | { __typename?: 'DiaperActivity', id: string, activityType: ActivityType, createdAt: string, diaperDetails?: { __typename?: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null }
      | { __typename?: 'FeedActivity', id: string, activityType: ActivityType, createdAt: string, feedDetails?: { __typename?: 'FeedDetails', startTime: string, endTime?: string | null, amountMl?: number | null, feedType?: FeedType | null, durationMinutes?: number | null } | null }
      | { __typename?: 'SleepActivity', id: string, activityType: ActivityType, createdAt: string, sleepDetails?: { __typename?: 'SleepDetails', startTime: string, endTime?: string | null, durationMinutes?: number | null, isActive?: boolean | null } | null }
    >, summary: { __typename?: 'CareSessionSummary', totalFeeds: number, totalMl: number, totalDiaperChanges: number, totalSleepMinutes: number, lastFeedTime?: string | null, lastSleepTime?: string | null, currentlyAsleep: boolean } } | null };

export type GetRecentSessionsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetRecentSessionsQuery = { __typename?: 'Query', getRecentCareSessions: Array<{ __typename?: 'CareSession', id: string, status: CareSessionStatus, startedAt: string, completedAt?: string | null, caregiver: { __typename?: 'Caregiver', id: string, name: string }, activities: Array<
      | { __typename?: 'DiaperActivity', id: string, activityType: ActivityType, createdAt: string, diaperDetails?: { __typename?: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null }
      | { __typename?: 'FeedActivity', id: string, activityType: ActivityType, createdAt: string, feedDetails?: { __typename?: 'FeedDetails', startTime: string, endTime?: string | null, amountMl?: number | null, feedType?: FeedType | null, durationMinutes?: number | null } | null }
      | { __typename?: 'SleepActivity', id: string, activityType: ActivityType, createdAt: string, sleepDetails?: { __typename?: 'SleepDetails', startTime: string, endTime?: string | null, durationMinutes?: number | null, isActive?: boolean | null } | null }
    >, summary: { __typename?: 'CareSessionSummary', totalFeeds: number, totalMl: number, totalDiaperChanges: number, totalSleepMinutes: number, lastFeedTime?: string | null, lastSleepTime?: string | null, currentlyAsleep: boolean } }> };

export type CareSessionDetailFragment = { __typename?: 'CareSession', id: string, status: CareSessionStatus, startedAt: string, completedAt?: string | null, notes?: string | null, caregiver: { __typename?: 'Caregiver', id: string, name: string }, activities: Array<
    | { __typename?: 'DiaperActivity', id: string, activityType: ActivityType, createdAt: string, diaperDetails?: { __typename?: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null }
    | { __typename?: 'FeedActivity', id: string, activityType: ActivityType, createdAt: string, feedDetails?: { __typename?: 'FeedDetails', startTime: string, endTime?: string | null, amountMl?: number | null, feedType?: FeedType | null, durationMinutes?: number | null } | null }
    | { __typename?: 'SleepActivity', id: string, activityType: ActivityType, createdAt: string, sleepDetails?: { __typename?: 'SleepDetails', startTime: string, endTime?: string | null, durationMinutes?: number | null, isActive?: boolean | null } | null }
  >, summary: { __typename?: 'CareSessionSummary', totalFeeds: number, totalMl: number, totalDiaperChanges: number, totalSleepMinutes: number } };

export type GetCareSessionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetCareSessionQuery = { __typename?: 'Query', getCareSession?: { __typename?: 'CareSession', id: string, status: CareSessionStatus, startedAt: string, completedAt?: string | null, notes?: string | null, caregiver: { __typename?: 'Caregiver', id: string, name: string }, activities: Array<
      | { __typename?: 'DiaperActivity', id: string, activityType: ActivityType, createdAt: string, diaperDetails?: { __typename?: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null }
      | { __typename?: 'FeedActivity', id: string, activityType: ActivityType, createdAt: string, feedDetails?: { __typename?: 'FeedDetails', startTime: string, endTime?: string | null, amountMl?: number | null, feedType?: FeedType | null, durationMinutes?: number | null } | null }
      | { __typename?: 'SleepActivity', id: string, activityType: ActivityType, createdAt: string, sleepDetails?: { __typename?: 'SleepDetails', startTime: string, endTime?: string | null, durationMinutes?: number | null, isActive?: boolean | null } | null }
    >, summary: { __typename?: 'CareSessionSummary', totalFeeds: number, totalMl: number, totalDiaperChanges: number, totalSleepMinutes: number } } | null };

export type GetFamilySettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetFamilySettingsQuery = { __typename?: 'Query', getMyFamily?: { __typename?: 'Family', id: string, name: string, babyName: string, password: string, caregivers: Array<{ __typename?: 'Caregiver', id: string, name: string, deviceId: string, deviceName?: string | null }> } | null };

export const CareSessionDetailFragmentDoc = gql`
    fragment CareSessionDetail on CareSession {
  id
  status
  startedAt
  completedAt
  caregiver {
    id
    name
  }
  activities {
    ... on FeedActivity {
      id
      activityType
      createdAt
      feedDetails {
        startTime
        endTime
        amountMl
        feedType
        durationMinutes
      }
    }
    ... on DiaperActivity {
      id
      activityType
      createdAt
      diaperDetails {
        changedAt
        hadPoop
        hadPee
      }
    }
    ... on SleepActivity {
      id
      activityType
      createdAt
      sleepDetails {
        startTime
        endTime
        durationMinutes
        isActive
      }
    }
  }
  summary {
    totalFeeds
    totalMl
    totalDiaperChanges
    totalSleepMinutes
  }
  notes
}
    `;
export const CreateFamilyDocument = gql`
    mutation CreateFamily($familyName: String!, $password: String!, $babyName: String!, $caregiverName: String!, $deviceId: String!, $deviceName: String) {
  createFamily(
    familyName: $familyName
    password: $password
    babyName: $babyName
    caregiverName: $caregiverName
    deviceId: $deviceId
    deviceName: $deviceName
  ) {
    success
    error
    family {
      id
      name
      babyName
      createdAt
    }
    caregiver {
      id
      name
      deviceId
      familyId
    }
  }
}
    `;
export type CreateFamilyMutationFn = Apollo.MutationFunction<CreateFamilyMutation, CreateFamilyMutationVariables>;

/**
 * __useCreateFamilyMutation__
 *
 * To run a mutation, you first call `useCreateFamilyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateFamilyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createFamilyMutation, { data, loading, error }] = useCreateFamilyMutation({
 *   variables: {
 *      familyName: // value for 'familyName'
 *      password: // value for 'password'
 *      babyName: // value for 'babyName'
 *      caregiverName: // value for 'caregiverName'
 *      deviceId: // value for 'deviceId'
 *      deviceName: // value for 'deviceName'
 *   },
 * });
 */
export function useCreateFamilyMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateFamilyMutation, CreateFamilyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateFamilyMutation, CreateFamilyMutationVariables>(CreateFamilyDocument, options);
      }
export type CreateFamilyMutationHookResult = ReturnType<typeof useCreateFamilyMutation>;
export type CreateFamilyMutationResult = Apollo.MutationResult<CreateFamilyMutation>;
export type CreateFamilyMutationOptions = Apollo.BaseMutationOptions<CreateFamilyMutation, CreateFamilyMutationVariables>;
export const JoinFamilyDocument = gql`
    mutation JoinFamily($familyName: String!, $password: String!, $caregiverName: String!, $deviceId: String!, $deviceName: String) {
  joinFamily(
    familyName: $familyName
    password: $password
    caregiverName: $caregiverName
    deviceId: $deviceId
    deviceName: $deviceName
  ) {
    success
    error
    family {
      id
      name
      babyName
      createdAt
    }
    caregiver {
      id
      name
      deviceId
      familyId
    }
  }
}
    `;
export type JoinFamilyMutationFn = Apollo.MutationFunction<JoinFamilyMutation, JoinFamilyMutationVariables>;

/**
 * __useJoinFamilyMutation__
 *
 * To run a mutation, you first call `useJoinFamilyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJoinFamilyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [joinFamilyMutation, { data, loading, error }] = useJoinFamilyMutation({
 *   variables: {
 *      familyName: // value for 'familyName'
 *      password: // value for 'password'
 *      caregiverName: // value for 'caregiverName'
 *      deviceId: // value for 'deviceId'
 *      deviceName: // value for 'deviceName'
 *   },
 * });
 */
export function useJoinFamilyMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<JoinFamilyMutation, JoinFamilyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<JoinFamilyMutation, JoinFamilyMutationVariables>(JoinFamilyDocument, options);
      }
export type JoinFamilyMutationHookResult = ReturnType<typeof useJoinFamilyMutation>;
export type JoinFamilyMutationResult = Apollo.MutationResult<JoinFamilyMutation>;
export type JoinFamilyMutationOptions = Apollo.BaseMutationOptions<JoinFamilyMutation, JoinFamilyMutationVariables>;
export const CheckFamilyNameAvailableDocument = gql`
    query CheckFamilyNameAvailable($name: String!) {
  checkFamilyNameAvailable(name: $name)
}
    `;

/**
 * __useCheckFamilyNameAvailableQuery__
 *
 * To run a query within a React component, call `useCheckFamilyNameAvailableQuery` and pass it any options that fit your needs.
 * When your component renders, `useCheckFamilyNameAvailableQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCheckFamilyNameAvailableQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCheckFamilyNameAvailableQuery(baseOptions: ApolloReactHooks.QueryHookOptions<CheckFamilyNameAvailableQuery, CheckFamilyNameAvailableQueryVariables> & ({ variables: CheckFamilyNameAvailableQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<CheckFamilyNameAvailableQuery, CheckFamilyNameAvailableQueryVariables>(CheckFamilyNameAvailableDocument, options);
      }
export function useCheckFamilyNameAvailableLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<CheckFamilyNameAvailableQuery, CheckFamilyNameAvailableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<CheckFamilyNameAvailableQuery, CheckFamilyNameAvailableQueryVariables>(CheckFamilyNameAvailableDocument, options);
        }
export function useCheckFamilyNameAvailableSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<CheckFamilyNameAvailableQuery, CheckFamilyNameAvailableQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<CheckFamilyNameAvailableQuery, CheckFamilyNameAvailableQueryVariables>(CheckFamilyNameAvailableDocument, options);
        }
export type CheckFamilyNameAvailableQueryHookResult = ReturnType<typeof useCheckFamilyNameAvailableQuery>;
export type CheckFamilyNameAvailableLazyQueryHookResult = ReturnType<typeof useCheckFamilyNameAvailableLazyQuery>;
export type CheckFamilyNameAvailableSuspenseQueryHookResult = ReturnType<typeof useCheckFamilyNameAvailableSuspenseQuery>;
export type CheckFamilyNameAvailableQueryResult = Apollo.QueryResult<CheckFamilyNameAvailableQuery, CheckFamilyNameAvailableQueryVariables>;
export const ParseVoiceInputDocument = gql`
    mutation ParseVoiceInput($text: String!) {
  parseVoiceInput(text: $text) {
    success
    parsedActivities {
      activityType
      feedDetails {
        startTime
        endTime
        amountMl
        feedType
        durationMinutes
      }
      diaperDetails {
        changedAt
        hadPoop
        hadPee
      }
      sleepDetails {
        startTime
        endTime
        durationMinutes
        isActive
      }
    }
    errors
    rawText
  }
}
    `;
export type ParseVoiceInputMutationFn = Apollo.MutationFunction<ParseVoiceInputMutation, ParseVoiceInputMutationVariables>;

/**
 * __useParseVoiceInputMutation__
 *
 * To run a mutation, you first call `useParseVoiceInputMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useParseVoiceInputMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [parseVoiceInputMutation, { data, loading, error }] = useParseVoiceInputMutation({
 *   variables: {
 *      text: // value for 'text'
 *   },
 * });
 */
export function useParseVoiceInputMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ParseVoiceInputMutation, ParseVoiceInputMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ParseVoiceInputMutation, ParseVoiceInputMutationVariables>(ParseVoiceInputDocument, options);
      }
export type ParseVoiceInputMutationHookResult = ReturnType<typeof useParseVoiceInputMutation>;
export type ParseVoiceInputMutationResult = Apollo.MutationResult<ParseVoiceInputMutation>;
export type ParseVoiceInputMutationOptions = Apollo.BaseMutationOptions<ParseVoiceInputMutation, ParseVoiceInputMutationVariables>;
export const GetPredictionDocument = gql`
    query GetPrediction {
  predictNextFeed {
    predictedTime
    confidence
    minutesUntilFeed
    reasoning
  }
}
    `;

/**
 * __useGetPredictionQuery__
 *
 * To run a query within a React component, call `useGetPredictionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPredictionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPredictionQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetPredictionQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetPredictionQuery, GetPredictionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetPredictionQuery, GetPredictionQueryVariables>(GetPredictionDocument, options);
      }
export function useGetPredictionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetPredictionQuery, GetPredictionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetPredictionQuery, GetPredictionQueryVariables>(GetPredictionDocument, options);
        }
export function useGetPredictionSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetPredictionQuery, GetPredictionQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetPredictionQuery, GetPredictionQueryVariables>(GetPredictionDocument, options);
        }
export type GetPredictionQueryHookResult = ReturnType<typeof useGetPredictionQuery>;
export type GetPredictionLazyQueryHookResult = ReturnType<typeof useGetPredictionLazyQuery>;
export type GetPredictionSuspenseQueryHookResult = ReturnType<typeof useGetPredictionSuspenseQuery>;
export type GetPredictionQueryResult = Apollo.QueryResult<GetPredictionQuery, GetPredictionQueryVariables>;
export const GetCurrentSessionDocument = gql`
    query GetCurrentSession {
  getCurrentSession {
    id
    status
    startedAt
    completedAt
    caregiver {
      id
      name
      deviceId
      deviceName
    }
    activities {
      ... on FeedActivity {
        id
        activityType
        createdAt
        feedDetails {
          startTime
          endTime
          amountMl
          feedType
          durationMinutes
        }
      }
      ... on DiaperActivity {
        id
        activityType
        createdAt
        diaperDetails {
          changedAt
          hadPoop
          hadPee
        }
      }
      ... on SleepActivity {
        id
        activityType
        createdAt
        sleepDetails {
          startTime
          endTime
          durationMinutes
          isActive
        }
      }
    }
    summary {
      totalFeeds
      totalMl
      totalDiaperChanges
      totalSleepMinutes
      lastFeedTime
      lastSleepTime
      currentlyAsleep
    }
    notes
  }
}
    `;

/**
 * __useGetCurrentSessionQuery__
 *
 * To run a query within a React component, call `useGetCurrentSessionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCurrentSessionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCurrentSessionQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetCurrentSessionQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetCurrentSessionQuery, GetCurrentSessionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetCurrentSessionQuery, GetCurrentSessionQueryVariables>(GetCurrentSessionDocument, options);
      }
export function useGetCurrentSessionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetCurrentSessionQuery, GetCurrentSessionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetCurrentSessionQuery, GetCurrentSessionQueryVariables>(GetCurrentSessionDocument, options);
        }
export function useGetCurrentSessionSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetCurrentSessionQuery, GetCurrentSessionQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetCurrentSessionQuery, GetCurrentSessionQueryVariables>(GetCurrentSessionDocument, options);
        }
export type GetCurrentSessionQueryHookResult = ReturnType<typeof useGetCurrentSessionQuery>;
export type GetCurrentSessionLazyQueryHookResult = ReturnType<typeof useGetCurrentSessionLazyQuery>;
export type GetCurrentSessionSuspenseQueryHookResult = ReturnType<typeof useGetCurrentSessionSuspenseQuery>;
export type GetCurrentSessionQueryResult = Apollo.QueryResult<GetCurrentSessionQuery, GetCurrentSessionQueryVariables>;
export const GetRecentSessionsDocument = gql`
    query GetRecentSessions($limit: Int) {
  getRecentCareSessions(limit: $limit) {
    id
    status
    startedAt
    completedAt
    caregiver {
      id
      name
    }
    activities {
      ... on FeedActivity {
        id
        activityType
        createdAt
        feedDetails {
          startTime
          endTime
          amountMl
          feedType
          durationMinutes
        }
      }
      ... on DiaperActivity {
        id
        activityType
        createdAt
        diaperDetails {
          changedAt
          hadPoop
          hadPee
        }
      }
      ... on SleepActivity {
        id
        activityType
        createdAt
        sleepDetails {
          startTime
          endTime
          durationMinutes
          isActive
        }
      }
    }
    summary {
      totalFeeds
      totalMl
      totalDiaperChanges
      totalSleepMinutes
      lastFeedTime
      lastSleepTime
      currentlyAsleep
    }
  }
}
    `;

/**
 * __useGetRecentSessionsQuery__
 *
 * To run a query within a React component, call `useGetRecentSessionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRecentSessionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRecentSessionsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetRecentSessionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetRecentSessionsQuery, GetRecentSessionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetRecentSessionsQuery, GetRecentSessionsQueryVariables>(GetRecentSessionsDocument, options);
      }
export function useGetRecentSessionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetRecentSessionsQuery, GetRecentSessionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetRecentSessionsQuery, GetRecentSessionsQueryVariables>(GetRecentSessionsDocument, options);
        }
export function useGetRecentSessionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetRecentSessionsQuery, GetRecentSessionsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetRecentSessionsQuery, GetRecentSessionsQueryVariables>(GetRecentSessionsDocument, options);
        }
export type GetRecentSessionsQueryHookResult = ReturnType<typeof useGetRecentSessionsQuery>;
export type GetRecentSessionsLazyQueryHookResult = ReturnType<typeof useGetRecentSessionsLazyQuery>;
export type GetRecentSessionsSuspenseQueryHookResult = ReturnType<typeof useGetRecentSessionsSuspenseQuery>;
export type GetRecentSessionsQueryResult = Apollo.QueryResult<GetRecentSessionsQuery, GetRecentSessionsQueryVariables>;
export const GetCareSessionDocument = gql`
    query GetCareSession($id: ID!) {
  getCareSession(id: $id) {
    ...CareSessionDetail
  }
}
    ${CareSessionDetailFragmentDoc}`;

/**
 * __useGetCareSessionQuery__
 *
 * To run a query within a React component, call `useGetCareSessionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCareSessionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCareSessionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetCareSessionQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetCareSessionQuery, GetCareSessionQueryVariables> & ({ variables: GetCareSessionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetCareSessionQuery, GetCareSessionQueryVariables>(GetCareSessionDocument, options);
      }
export function useGetCareSessionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetCareSessionQuery, GetCareSessionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetCareSessionQuery, GetCareSessionQueryVariables>(GetCareSessionDocument, options);
        }
export function useGetCareSessionSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetCareSessionQuery, GetCareSessionQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetCareSessionQuery, GetCareSessionQueryVariables>(GetCareSessionDocument, options);
        }
export type GetCareSessionQueryHookResult = ReturnType<typeof useGetCareSessionQuery>;
export type GetCareSessionLazyQueryHookResult = ReturnType<typeof useGetCareSessionLazyQuery>;
export type GetCareSessionSuspenseQueryHookResult = ReturnType<typeof useGetCareSessionSuspenseQuery>;
export type GetCareSessionQueryResult = Apollo.QueryResult<GetCareSessionQuery, GetCareSessionQueryVariables>;
export const GetFamilySettingsDocument = gql`
    query GetFamilySettings {
  getMyFamily {
    id
    name
    babyName
    password
    caregivers {
      id
      name
      deviceId
      deviceName
    }
  }
}
    `;

/**
 * __useGetFamilySettingsQuery__
 *
 * To run a query within a React component, call `useGetFamilySettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFamilySettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFamilySettingsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetFamilySettingsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetFamilySettingsQuery, GetFamilySettingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetFamilySettingsQuery, GetFamilySettingsQueryVariables>(GetFamilySettingsDocument, options);
      }
export function useGetFamilySettingsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetFamilySettingsQuery, GetFamilySettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetFamilySettingsQuery, GetFamilySettingsQueryVariables>(GetFamilySettingsDocument, options);
        }
export function useGetFamilySettingsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetFamilySettingsQuery, GetFamilySettingsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetFamilySettingsQuery, GetFamilySettingsQueryVariables>(GetFamilySettingsDocument, options);
        }
export type GetFamilySettingsQueryHookResult = ReturnType<typeof useGetFamilySettingsQuery>;
export type GetFamilySettingsLazyQueryHookResult = ReturnType<typeof useGetFamilySettingsLazyQuery>;
export type GetFamilySettingsSuspenseQueryHookResult = ReturnType<typeof useGetFamilySettingsSuspenseQuery>;
export type GetFamilySettingsQueryResult = Apollo.QueryResult<GetFamilySettingsQuery, GetFamilySettingsQueryVariables>;