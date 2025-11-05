// src/types/activity.ts

/**
 * Shared type definitions for activities
 * TODO: Replace with auto-generated types from GraphQL codegen
 */

// Feed Activity
export interface FeedDetails {
  startTime: Date;
  endTime: Date | null;
  amountMl: number;
  feedType: 'FORMULA' | 'BREAST_MILK';
  durationMinutes?: number;
}

export type FeedActivity = {
  id: string;
  activityType: 'FEED';
  createdAt: Date;
  feedDetails: FeedDetails;
};

// Diaper Activity
export interface DiaperDetails {
  changedAt: Date;
  hadPoop: boolean;
  hadPee: boolean;
}

export type DiaperActivity = {
  id: string;
  activityType: 'DIAPER';
  createdAt: Date;
  diaperDetails: DiaperDetails;
};

// Sleep Activity
export interface SleepDetails {
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number | null;
  isActive: boolean;
}

export type SleepActivity = {
  id: string;
  activityType: 'SLEEP';
  createdAt: Date;
  sleepDetails: SleepDetails;
};

// Discriminated union
export type Activity = FeedActivity | DiaperActivity | SleepActivity;
