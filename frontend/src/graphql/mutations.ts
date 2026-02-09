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
