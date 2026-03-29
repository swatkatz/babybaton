import { gql } from '@apollo/client';

export const GET_PREDICTION = gql`
  query GetPrediction {
    predictNextFeed {
      predictedTime
      confidence
      minutesUntilFeed
      reasoning
    }
  }
`;

export const GET_CURRENT_SESSION = gql`
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
            foodName
            quantity
            quantityUnit
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

export const GET_RECENT_SESSIONS = gql`
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
            foodName
            quantity
            quantityUnit
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

export const CARE_SESSION_FRAGMENT = gql`
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
          foodName
          quantity
          quantityUnit
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

export const GET_CARE_SESSION = gql`
  query GetCareSession($id: ID!) {
    getCareSession(id: $id) {
      ...CareSessionDetail
    }
  }
  ${CARE_SESSION_FRAGMENT}
`;

export const GET_MY_FAMILIES = gql`
  query GetMyFamilies {
    getMyFamilies {
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

export const GET_MY_CAREGIVER = gql`
  query GetMyCaregiver {
    getMyCaregiver {
      id
      name
      familyId
    }
  }
`;

export const GET_BABY_STATUS = gql`
  query GetBabyStatus {
    getBabyStatus {
      lastFeed {
        id
        activityType
        createdAt
        feedDetails {
          startTime
          endTime
          amountMl
          feedType
          foodName
        }
      }
      lastDiaper {
        id
        activityType
        createdAt
        diaperDetails {
          changedAt
          hadPoop
          hadPee
        }
      }
      lastSleep {
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

export const GET_CARE_SESSION_HISTORY = gql`
  query GetCareSessionHistory($first: Int!, $after: String) {
    getCareSessionHistory(first: $first, after: $after) {
      edges {
        cursor
        node {
          ...CareSessionDetail
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${CARE_SESSION_FRAGMENT}
`;

export const GET_FAMILY_SETTINGS = gql`
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
