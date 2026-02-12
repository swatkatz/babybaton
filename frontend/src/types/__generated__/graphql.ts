import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  Upload: { input: File; output: File; }
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
  __typename: 'AuthResult';
  caregiver: Maybe<Caregiver>;
  error: Maybe<Scalars['String']['output']>;
  family: Maybe<Family>;
  success: Scalars['Boolean']['output'];
};

export type CareSession = {
  __typename: 'CareSession';
  activities: Array<Activity>;
  caregiver: Caregiver;
  completedAt: Maybe<Scalars['DateTime']['output']>;
  familyId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  startedAt: Scalars['DateTime']['output'];
  status: CareSessionStatus;
  summary: CareSessionSummary;
};

export enum CareSessionStatus {
  Completed = 'COMPLETED',
  InProgress = 'IN_PROGRESS'
}

export type CareSessionSummary = {
  __typename: 'CareSessionSummary';
  currentlyAsleep: Scalars['Boolean']['output'];
  lastFeedTime: Maybe<Scalars['DateTime']['output']>;
  lastSleepTime: Maybe<Scalars['DateTime']['output']>;
  totalDiaperChanges: Scalars['Int']['output'];
  totalFeeds: Scalars['Int']['output'];
  totalMl: Scalars['Int']['output'];
  totalSleepMinutes: Scalars['Int']['output'];
};

export type Caregiver = {
  __typename: 'Caregiver';
  createdAt: Scalars['DateTime']['output'];
  deviceId: Scalars['String']['output'];
  deviceName: Maybe<Scalars['String']['output']>;
  familyId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type DiaperActivity = {
  __typename: 'DiaperActivity';
  activityType: ActivityType;
  createdAt: Scalars['DateTime']['output'];
  diaperDetails: Maybe<DiaperDetails>;
  id: Scalars['ID']['output'];
};

export type DiaperDetails = {
  __typename: 'DiaperDetails';
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
  __typename: 'Family';
  babyName: Scalars['String']['output'];
  caregivers: Array<Caregiver>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  password: Scalars['String']['output'];
};

export type FeedActivity = {
  __typename: 'FeedActivity';
  activityType: ActivityType;
  createdAt: Scalars['DateTime']['output'];
  feedDetails: Maybe<FeedDetails>;
  id: Scalars['ID']['output'];
};

export type FeedDetails = {
  __typename: 'FeedDetails';
  amountMl: Maybe<Scalars['Int']['output']>;
  durationMinutes: Maybe<Scalars['Int']['output']>;
  endTime: Maybe<Scalars['DateTime']['output']>;
  feedType: Maybe<FeedType>;
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
  __typename: 'Mutation';
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
  audioFile: Scalars['Upload']['input'];
};


export type MutationUpdateBabyNameArgs = {
  babyName: Scalars['String']['input'];
};

export type NextFeedPrediction = {
  __typename: 'NextFeedPrediction';
  confidence: PredictionConfidence;
  minutesUntilFeed: Scalars['Int']['output'];
  predictedTime: Scalars['DateTime']['output'];
  reasoning: Maybe<Scalars['String']['output']>;
};

export type ParsedActivity = {
  __typename: 'ParsedActivity';
  activityType: ActivityType;
  diaperDetails: Maybe<DiaperDetails>;
  feedDetails: Maybe<FeedDetails>;
  sleepDetails: Maybe<SleepDetails>;
};

export type ParsedVoiceResult = {
  __typename: 'ParsedVoiceResult';
  errors: Maybe<Array<Scalars['String']['output']>>;
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
  __typename: 'Query';
  checkFamilyNameAvailable: Scalars['Boolean']['output'];
  getCareSession: Maybe<CareSession>;
  getCurrentSession: Maybe<CareSession>;
  getMyCaregiver: Maybe<Caregiver>;
  getMyFamily: Maybe<Family>;
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
  __typename: 'SleepActivity';
  activityType: ActivityType;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  sleepDetails: Maybe<SleepDetails>;
};

export type SleepDetails = {
  __typename: 'SleepDetails';
  durationMinutes: Maybe<Scalars['Int']['output']>;
  endTime: Maybe<Scalars['DateTime']['output']>;
  isActive: Maybe<Scalars['Boolean']['output']>;
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


export type CreateFamilyMutation = { createFamily: { __typename: 'AuthResult', success: boolean, error: string | null, family: { __typename: 'Family', id: string, name: string, babyName: string, createdAt: string } | null, caregiver: { __typename: 'Caregiver', id: string, name: string, deviceId: string, familyId: string } | null } };

export type JoinFamilyMutationVariables = Exact<{
  familyName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  caregiverName: Scalars['String']['input'];
  deviceId: Scalars['String']['input'];
  deviceName?: InputMaybe<Scalars['String']['input']>;
}>;


export type JoinFamilyMutation = { joinFamily: { __typename: 'AuthResult', success: boolean, error: string | null, family: { __typename: 'Family', id: string, name: string, babyName: string, createdAt: string } | null, caregiver: { __typename: 'Caregiver', id: string, name: string, deviceId: string, familyId: string } | null } };

export type CheckFamilyNameAvailableQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type CheckFamilyNameAvailableQuery = { checkFamilyNameAvailable: boolean };

export type ParseVoiceInputMutationVariables = Exact<{
  audioFile: Scalars['Upload']['input'];
}>;


export type ParseVoiceInputMutation = { parseVoiceInput: { __typename: 'ParsedVoiceResult', success: boolean, errors: Array<string> | null, rawText: string, parsedActivities: Array<{ __typename: 'ParsedActivity', activityType: ActivityType, feedDetails: { __typename: 'FeedDetails', startTime: string, endTime: string | null, amountMl: number | null, feedType: FeedType | null, durationMinutes: number | null } | null, diaperDetails: { __typename: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null, sleepDetails: { __typename: 'SleepDetails', startTime: string, endTime: string | null, durationMinutes: number | null, isActive: boolean | null } | null }> } };

export type AddActivitiesMutationVariables = Exact<{
  activities: Array<ActivityInput> | ActivityInput;
}>;


export type AddActivitiesMutation = { addActivities: { __typename: 'CareSession', id: string, familyId: string, status: CareSessionStatus, startedAt: string, completedAt: string | null, notes: string | null } };

export type LeaveFamilyMutationVariables = Exact<{ [key: string]: never; }>;


export type LeaveFamilyMutation = { leaveFamily: boolean };

export type CompleteCareSessionMutationVariables = Exact<{
  notes?: InputMaybe<Scalars['String']['input']>;
}>;


export type CompleteCareSessionMutation = { completeCareSession: { __typename: 'CareSession', id: string, status: CareSessionStatus, completedAt: string | null } };

export type GetPredictionQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPredictionQuery = { predictNextFeed: { __typename: 'NextFeedPrediction', predictedTime: string, confidence: PredictionConfidence, minutesUntilFeed: number, reasoning: string | null } };

export type GetCurrentSessionQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentSessionQuery = { getCurrentSession: { __typename: 'CareSession', id: string, status: CareSessionStatus, startedAt: string, completedAt: string | null, notes: string | null, caregiver: { __typename: 'Caregiver', id: string, name: string, deviceId: string, deviceName: string | null }, activities: Array<
      | { __typename: 'DiaperActivity', id: string, activityType: ActivityType, createdAt: string, diaperDetails: { __typename: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null }
      | { __typename: 'FeedActivity', id: string, activityType: ActivityType, createdAt: string, feedDetails: { __typename: 'FeedDetails', startTime: string, endTime: string | null, amountMl: number | null, feedType: FeedType | null, durationMinutes: number | null } | null }
      | { __typename: 'SleepActivity', id: string, activityType: ActivityType, createdAt: string, sleepDetails: { __typename: 'SleepDetails', startTime: string, endTime: string | null, durationMinutes: number | null, isActive: boolean | null } | null }
    >, summary: { __typename: 'CareSessionSummary', totalFeeds: number, totalMl: number, totalDiaperChanges: number, totalSleepMinutes: number, lastFeedTime: string | null, lastSleepTime: string | null, currentlyAsleep: boolean } } | null };

export type GetRecentSessionsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetRecentSessionsQuery = { getRecentCareSessions: Array<{ __typename: 'CareSession', id: string, status: CareSessionStatus, startedAt: string, completedAt: string | null, caregiver: { __typename: 'Caregiver', id: string, name: string }, activities: Array<
      | { __typename: 'DiaperActivity', id: string, activityType: ActivityType, createdAt: string, diaperDetails: { __typename: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null }
      | { __typename: 'FeedActivity', id: string, activityType: ActivityType, createdAt: string, feedDetails: { __typename: 'FeedDetails', startTime: string, endTime: string | null, amountMl: number | null, feedType: FeedType | null, durationMinutes: number | null } | null }
      | { __typename: 'SleepActivity', id: string, activityType: ActivityType, createdAt: string, sleepDetails: { __typename: 'SleepDetails', startTime: string, endTime: string | null, durationMinutes: number | null, isActive: boolean | null } | null }
    >, summary: { __typename: 'CareSessionSummary', totalFeeds: number, totalMl: number, totalDiaperChanges: number, totalSleepMinutes: number, lastFeedTime: string | null, lastSleepTime: string | null, currentlyAsleep: boolean } }> };

export type CareSessionDetailFragment = { __typename: 'CareSession', id: string, status: CareSessionStatus, startedAt: string, completedAt: string | null, notes: string | null, caregiver: { __typename: 'Caregiver', id: string, name: string }, activities: Array<
    | { __typename: 'DiaperActivity', id: string, activityType: ActivityType, createdAt: string, diaperDetails: { __typename: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null }
    | { __typename: 'FeedActivity', id: string, activityType: ActivityType, createdAt: string, feedDetails: { __typename: 'FeedDetails', startTime: string, endTime: string | null, amountMl: number | null, feedType: FeedType | null, durationMinutes: number | null } | null }
    | { __typename: 'SleepActivity', id: string, activityType: ActivityType, createdAt: string, sleepDetails: { __typename: 'SleepDetails', startTime: string, endTime: string | null, durationMinutes: number | null, isActive: boolean | null } | null }
  >, summary: { __typename: 'CareSessionSummary', totalFeeds: number, totalMl: number, totalDiaperChanges: number, totalSleepMinutes: number } };

export type GetCareSessionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetCareSessionQuery = { getCareSession: { __typename: 'CareSession', id: string, status: CareSessionStatus, startedAt: string, completedAt: string | null, notes: string | null, caregiver: { __typename: 'Caregiver', id: string, name: string }, activities: Array<
      | { __typename: 'DiaperActivity', id: string, activityType: ActivityType, createdAt: string, diaperDetails: { __typename: 'DiaperDetails', changedAt: string, hadPoop: boolean, hadPee: boolean } | null }
      | { __typename: 'FeedActivity', id: string, activityType: ActivityType, createdAt: string, feedDetails: { __typename: 'FeedDetails', startTime: string, endTime: string | null, amountMl: number | null, feedType: FeedType | null, durationMinutes: number | null } | null }
      | { __typename: 'SleepActivity', id: string, activityType: ActivityType, createdAt: string, sleepDetails: { __typename: 'SleepDetails', startTime: string, endTime: string | null, durationMinutes: number | null, isActive: boolean | null } | null }
    >, summary: { __typename: 'CareSessionSummary', totalFeeds: number, totalMl: number, totalDiaperChanges: number, totalSleepMinutes: number } } | null };

export type GetFamilySettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetFamilySettingsQuery = { getMyFamily: { __typename: 'Family', id: string, name: string, babyName: string, password: string, caregivers: Array<{ __typename: 'Caregiver', id: string, name: string, deviceId: string, deviceName: string | null }> } | null };

export const CareSessionDetailFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CareSessionDetail"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CareSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"caregiver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"activities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FeedActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"feedDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"amountMl"}},{"kind":"Field","name":{"kind":"Name","value":"feedType"}},{"kind":"Field","name":{"kind":"Name","value":"durationMinutes"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DiaperActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"diaperDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changedAt"}},{"kind":"Field","name":{"kind":"Name","value":"hadPoop"}},{"kind":"Field","name":{"kind":"Name","value":"hadPee"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SleepActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"sleepDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"durationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"summary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalFeeds"}},{"kind":"Field","name":{"kind":"Name","value":"totalMl"}},{"kind":"Field","name":{"kind":"Name","value":"totalDiaperChanges"}},{"kind":"Field","name":{"kind":"Name","value":"totalSleepMinutes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]} as unknown as DocumentNode<CareSessionDetailFragment, unknown>;
export const CreateFamilyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateFamily"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"babyName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"caregiverName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceName"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createFamily"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyName"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"babyName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"babyName"}}},{"kind":"Argument","name":{"kind":"Name","value":"caregiverName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"caregiverName"}}},{"kind":"Argument","name":{"kind":"Name","value":"deviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"deviceName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"family"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"babyName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"caregiver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"familyId"}}]}}]}}]}}]} as unknown as DocumentNode<CreateFamilyMutation, CreateFamilyMutationVariables>;
export const JoinFamilyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"JoinFamily"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"familyName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"caregiverName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceName"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"joinFamily"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"familyName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"familyName"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"caregiverName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"caregiverName"}}},{"kind":"Argument","name":{"kind":"Name","value":"deviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"deviceName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"family"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"babyName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"caregiver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"familyId"}}]}}]}}]}}]} as unknown as DocumentNode<JoinFamilyMutation, JoinFamilyMutationVariables>;
export const CheckFamilyNameAvailableDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CheckFamilyNameAvailable"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"checkFamilyNameAvailable"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}]}}]} as unknown as DocumentNode<CheckFamilyNameAvailableQuery, CheckFamilyNameAvailableQueryVariables>;
export const ParseVoiceInputDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ParseVoiceInput"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"audioFile"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Upload"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"parseVoiceInput"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"audioFile"},"value":{"kind":"Variable","name":{"kind":"Name","value":"audioFile"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"parsedActivities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"feedDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"amountMl"}},{"kind":"Field","name":{"kind":"Name","value":"feedType"}},{"kind":"Field","name":{"kind":"Name","value":"durationMinutes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"diaperDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changedAt"}},{"kind":"Field","name":{"kind":"Name","value":"hadPoop"}},{"kind":"Field","name":{"kind":"Name","value":"hadPee"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sleepDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"durationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"errors"}},{"kind":"Field","name":{"kind":"Name","value":"rawText"}}]}}]}}]} as unknown as DocumentNode<ParseVoiceInputMutation, ParseVoiceInputMutationVariables>;
export const AddActivitiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddActivities"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"activities"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ActivityInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addActivities"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"activities"},"value":{"kind":"Variable","name":{"kind":"Name","value":"activities"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"familyId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]} as unknown as DocumentNode<AddActivitiesMutation, AddActivitiesMutationVariables>;
export const LeaveFamilyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LeaveFamily"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"leaveFamily"}}]}}]} as unknown as DocumentNode<LeaveFamilyMutation, LeaveFamilyMutationVariables>;
export const CompleteCareSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CompleteCareSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"notes"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completeCareSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"notes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"notes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]}}]} as unknown as DocumentNode<CompleteCareSessionMutation, CompleteCareSessionMutationVariables>;
export const GetPredictionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPrediction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"predictNextFeed"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"predictedTime"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"minutesUntilFeed"}},{"kind":"Field","name":{"kind":"Name","value":"reasoning"}}]}}]}}]} as unknown as DocumentNode<GetPredictionQuery, GetPredictionQueryVariables>;
export const GetCurrentSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCurrentSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getCurrentSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"caregiver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"activities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FeedActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"feedDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"amountMl"}},{"kind":"Field","name":{"kind":"Name","value":"feedType"}},{"kind":"Field","name":{"kind":"Name","value":"durationMinutes"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DiaperActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"diaperDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changedAt"}},{"kind":"Field","name":{"kind":"Name","value":"hadPoop"}},{"kind":"Field","name":{"kind":"Name","value":"hadPee"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SleepActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"sleepDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"durationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"summary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalFeeds"}},{"kind":"Field","name":{"kind":"Name","value":"totalMl"}},{"kind":"Field","name":{"kind":"Name","value":"totalDiaperChanges"}},{"kind":"Field","name":{"kind":"Name","value":"totalSleepMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"lastFeedTime"}},{"kind":"Field","name":{"kind":"Name","value":"lastSleepTime"}},{"kind":"Field","name":{"kind":"Name","value":"currentlyAsleep"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]} as unknown as DocumentNode<GetCurrentSessionQuery, GetCurrentSessionQueryVariables>;
export const GetRecentSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRecentSessions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getRecentCareSessions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"caregiver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"activities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FeedActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"feedDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"amountMl"}},{"kind":"Field","name":{"kind":"Name","value":"feedType"}},{"kind":"Field","name":{"kind":"Name","value":"durationMinutes"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DiaperActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"diaperDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changedAt"}},{"kind":"Field","name":{"kind":"Name","value":"hadPoop"}},{"kind":"Field","name":{"kind":"Name","value":"hadPee"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SleepActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"sleepDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"durationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"summary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalFeeds"}},{"kind":"Field","name":{"kind":"Name","value":"totalMl"}},{"kind":"Field","name":{"kind":"Name","value":"totalDiaperChanges"}},{"kind":"Field","name":{"kind":"Name","value":"totalSleepMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"lastFeedTime"}},{"kind":"Field","name":{"kind":"Name","value":"lastSleepTime"}},{"kind":"Field","name":{"kind":"Name","value":"currentlyAsleep"}}]}}]}}]}}]} as unknown as DocumentNode<GetRecentSessionsQuery, GetRecentSessionsQueryVariables>;
export const GetCareSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCareSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getCareSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CareSessionDetail"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CareSessionDetail"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CareSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}},{"kind":"Field","name":{"kind":"Name","value":"caregiver"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"activities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FeedActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"feedDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"amountMl"}},{"kind":"Field","name":{"kind":"Name","value":"feedType"}},{"kind":"Field","name":{"kind":"Name","value":"durationMinutes"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DiaperActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"diaperDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changedAt"}},{"kind":"Field","name":{"kind":"Name","value":"hadPoop"}},{"kind":"Field","name":{"kind":"Name","value":"hadPee"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SleepActivity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"activityType"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"sleepDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"durationMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"summary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalFeeds"}},{"kind":"Field","name":{"kind":"Name","value":"totalMl"}},{"kind":"Field","name":{"kind":"Name","value":"totalDiaperChanges"}},{"kind":"Field","name":{"kind":"Name","value":"totalSleepMinutes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]} as unknown as DocumentNode<GetCareSessionQuery, GetCareSessionQueryVariables>;
export const GetFamilySettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFamilySettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getMyFamily"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"babyName"}},{"kind":"Field","name":{"kind":"Name","value":"password"}},{"kind":"Field","name":{"kind":"Name","value":"caregivers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}}]}}]}}]}}]} as unknown as DocumentNode<GetFamilySettingsQuery, GetFamilySettingsQueryVariables>;