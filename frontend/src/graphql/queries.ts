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
