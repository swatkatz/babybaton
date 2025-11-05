import { Activity } from './activity';

/**
 * Shared type definitions for care sessions
 * TODO: Replace with auto-generated types from GraphQL codegen
 */

export interface Caregiver {
  id: string;
  name: string;
  deviceId: string;
  deviceName: string | null;
}

export interface CareSessionSummary {
  totalFeeds: number;
  totalMl: number;
  totalDiaperChanges: number;
  totalSleepMinutes: number;
  lastFeedTime: Date | null;
  lastSleepTime: Date | null;
  currentlyAsleep: boolean;
}

export interface CareSession {
  id: string;
  caregiver: Caregiver;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: Date;
  completedAt: Date | null;
  activities: Activity[];
  notes: string | null;
  summary: CareSessionSummary;
}
