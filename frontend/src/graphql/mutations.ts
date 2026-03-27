import { gql } from '@apollo/client';

export const CREATE_FAMILY = gql`
  mutation CreateFamily(
    $familyName: String!
    $password: String!
    $babyName: String!
    $caregiverName: String!
    $deviceId: String!
    $deviceName: String
  ) {
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

export const JOIN_FAMILY = gql`
  mutation JoinFamily(
    $familyName: String!
    $password: String!
    $caregiverName: String!
    $deviceId: String!
    $deviceName: String
  ) {
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

export const CHECK_FAMILY_NAME_AVAILABLE = gql`
  query CheckFamilyNameAvailable($name: String!) {
    checkFamilyNameAvailable(name: $name)
  }
`;

export const PARSE_VOICE_INPUT = gql`
  mutation ParseVoiceInput($audioFile: Upload!) {
    parseVoiceInput(audioFile: $audioFile) {
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

export const ADD_ACTIVITIES = gql`
  mutation AddActivities($activities: [ActivityInput!]!) {
    addActivities(activities: $activities) {
      id
      familyId
      status
      startedAt
      completedAt
      notes
    }
  }
`;

export const LEAVE_FAMILY = gql`
  mutation LeaveFamily {
    leaveFamily
  }
`;

export const COMPLETE_CARE_SESSION = gql`
  mutation CompleteCareSession($notes: String) {
    completeCareSession(notes: $notes) {
      id
      status
      completedAt
    }
  }
`;

export const DELETE_ACTIVITY = gql`
  mutation DeleteActivity($activityId: ID!) {
    deleteActivity(activityId: $activityId)
  }
`;

export const UPDATE_ACTIVITY = gql`
  mutation UpdateActivity($activityId: ID!, $input: ActivityInput!) {
    updateActivity(activityId: $activityId, input: $input) {
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
  }
`;

export const LINK_CAREGIVER_TO_USER = gql`
  mutation LinkCaregiverToUser($caregiverId: ID!) {
    linkCaregiverToUser(caregiverId: $caregiverId) {
      id
      name
      deviceId
      familyId
    }
  }
`;

export const GET_MY_FAMILY = gql`
  query GetMyFamily {
    getMyFamily {
      id
      name
      babyName
      caregivers {
        id
        name
      }
    }
  }
`;

export const END_ACTIVITY = gql`
  mutation EndActivity($activityId: ID!, $endTime: DateTime) {
    endActivity(activityId: $activityId, endTime: $endTime) {
      ... on SleepActivity {
        id
        activityType
        sleepDetails {
          startTime
          endTime
          durationMinutes
          isActive
        }
      }
    }
  }
`;
