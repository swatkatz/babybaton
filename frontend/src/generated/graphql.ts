import { gql } from '@apollo/client';
import * as ApolloReactCommon from '@apollo/client/react';
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

export enum ActivityType {
  Diaper = 'DIAPER',
  Feed = 'FEED',
  Sleep = 'SLEEP'
}

export type CareSession = {
  __typename?: 'CareSession';
  activities: Array<Activity>;
  caregiver: Caregiver;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
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
  deviceId: Scalars['String']['output'];
  deviceName?: Maybe<Scalars['String']['output']>;
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

export enum FeedType {
  BreastMilk = 'BREAST_MILK',
  Formula = 'FORMULA'
}

export type NextFeedPrediction = {
  __typename?: 'NextFeedPrediction';
  confidence: PredictionConfidence;
  minutesUntilFeed: Scalars['Int']['output'];
  predictedTime: Scalars['DateTime']['output'];
  reasoning?: Maybe<Scalars['String']['output']>;
};

export enum PredictionConfidence {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export type Query = {
  __typename?: 'Query';
  getCurrentSession?: Maybe<CareSession>;
  getRecentCareSessions: Array<CareSession>;
  predictNextFeed: NextFeedPrediction;
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
  isActive: Scalars['Boolean']['output'];
  startTime: Scalars['DateTime']['output'];
};

export type GetPredictionQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPredictionQuery = { __typename?: 'Query', predictNextFeed: { __typename?: 'NextFeedPrediction', predictedTime: string, confidence: PredictionConfidence, minutesUntilFeed: number, reasoning?: string | null } };

export type GetCurrentSessionQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentSessionQuery = { __typename?: 'Query', getCurrentSession?: { __typename?: 'CareSession', id: string, status: CareSessionStatus, startedAt: string, completedAt?: string | null, notes?: string | null, caregiver: { __typename?: 'Caregiver', id: string, name: string, deviceId: string, deviceName?: string | null }, activities: Array<
      | { __typename?: 'DiaperActivity', id: string, activityType: ActivityType, createdAt: string, diaperDetails?: { __typename?: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null }
      | { __typename?: 'FeedActivity', id: string, activityType: ActivityType, createdAt: string, feedDetails?: { __typename?: 'FeedDetails', startTime: string, endTime?: string | null, amountMl?: number | null, feedType?: FeedType | null, durationMinutes?: number | null } | null }
      | { __typename?: 'SleepActivity', id: string, activityType: ActivityType, createdAt: string, sleepDetails?: { __typename?: 'SleepDetails', startTime: string, endTime?: string | null, durationMinutes?: number | null, isActive: boolean } | null }
    >, summary: { __typename?: 'CareSessionSummary', totalFeeds: number, totalMl: number, totalDiaperChanges: number, totalSleepMinutes: number, lastFeedTime?: string | null, lastSleepTime?: string | null, currentlyAsleep: boolean } } | null };

export type GetRecentSessionsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetRecentSessionsQuery = { __typename?: 'Query', getRecentCareSessions: Array<{ __typename?: 'CareSession', id: string, status: CareSessionStatus, startedAt: string, completedAt?: string | null, caregiver: { __typename?: 'Caregiver', id: string, name: string }, summary: { __typename?: 'CareSessionSummary', totalFeeds: number, totalMl: number, totalDiaperChanges: number, totalSleepMinutes: number, lastFeedTime?: string | null, lastSleepTime?: string | null, currentlyAsleep: boolean } }> };


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
export type GetPredictionQueryResult = ApolloReactCommon.QueryResult<GetPredictionQuery, GetPredictionQueryVariables>;
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
export type GetCurrentSessionQueryResult = ApolloReactCommon.QueryResult<GetCurrentSessionQuery, GetCurrentSessionQueryVariables>;
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
export type GetRecentSessionsQueryResult = ApolloReactCommon.QueryResult<GetRecentSessionsQuery, GetRecentSessionsQueryVariables>;