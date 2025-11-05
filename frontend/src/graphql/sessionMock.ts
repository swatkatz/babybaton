import { CareSession } from '../types/careSession';
import { FeedActivity, DiaperActivity, SleepActivity } from '../types/activity';

/**
 * Mock data for CareSession
 * TODO: Replace with GraphQL query results when backend is ready
 */

export const mockCurrentSession: CareSession = {
  id: 'session-1',
  caregiver: {
    id: 'caregiver-1',
    name: 'Mom',
    deviceId: 'device-123',
    deviceName: 'iPhone 12',
  },
  status: 'IN_PROGRESS',
  startedAt: new Date(Date.now() - 2.75 * 60 * 60 * 1000),
  completedAt: null,
  activities: [
    {
      id: 'activity-1',
      activityType: 'FEED',
      createdAt: new Date(Date.now() - 2.75 * 60 * 60 * 1000),
      feedDetails: {
        startTime: new Date(Date.now() - 2.75 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
        amountMl: 70,
        feedType: 'FORMULA',
        durationMinutes: 15,
      },
    } as FeedActivity,
    {
      id: 'activity-2',
      activityType: 'DIAPER',
      createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      diaperDetails: {
        changedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
        hadPoop: true,
        hadPee: true,
      },
    } as DiaperActivity,
    {
      id: 'activity-3',
      activityType: 'SLEEP',
      createdAt: new Date(Date.now() - 2.75 * 60 * 60 * 1000),
      sleepDetails: {
        startTime: new Date(Date.now() - 2.75 * 60 * 60 * 1000),
        endTime: null,
        durationMinutes: null,
        isActive: true,
      },
    } as SleepActivity,
  ],
  notes: null,
  summary: {
    totalFeeds: 1,
    totalMl: 70,
    totalDiaperChanges: 1,
    totalSleepMinutes: 165,
    lastFeedTime: new Date(Date.now() - 2.75 * 60 * 60 * 1000),
    lastSleepTime: new Date(Date.now() - 2.75 * 60 * 60 * 1000),
    currentlyAsleep: true,
  },
};

export const mockRecentSessions: CareSession[] = [
  {
    id: 'session-2',
    caregiver: {
      id: 'caregiver-2',
      name: 'Dad',
      deviceId: 'device-456',
      deviceName: 'Pixel 7',
    },
    status: 'COMPLETED',
    startedAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 4.75 * 60 * 60 * 1000),
    activities: [],
    notes: null,
    summary: {
      totalFeeds: 2,
      totalMl: 130,
      totalDiaperChanges: 2,
      totalSleepMinutes: 60,
      lastFeedTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
      lastSleepTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
      currentlyAsleep: false,
    },
  },
  {
    id: 'session-3',
    caregiver: {
      id: 'caregiver-3',
      name: 'Nani',
      deviceId: 'device-667',
      deviceName: 'Pixel 7',
    },
    status: 'COMPLETED',
    startedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 6.75 * 60 * 60 * 1000),
    activities: [],
    notes: null,
    summary: {
      totalFeeds: 2,
      totalMl: 130,
      totalDiaperChanges: 2,
      totalSleepMinutes: 60,
      lastFeedTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
      lastSleepTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
      currentlyAsleep: false,
    },
  },
];
