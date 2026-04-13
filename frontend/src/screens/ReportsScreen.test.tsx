import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ApolloClient, InMemoryCache, ApolloLink, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { ReportsScreen } from './ReportsScreen';
import {
  GetCareReportDocument,
  ReportGranularity,
  FeedType as FeedTypeEnum,
} from '../types/__generated__/graphql';

jest.mock('../theme/colors', () => ({
  colors: {
    primary: '#5B9BD5',
    primaryLight: '#A8D5F2',
    accent: '#FFB6A3',
    success: '#7BC96F',
    warning: '#FFD93D',
    error: '#FF6B6B',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    textLight: '#A8B4C0',
    feed: '#5B9BD5',
    diaper: '#FFB6A3',
    sleep: '#B19CD9',
  },
}));

jest.mock('react-native-gifted-charts', () => ({
  BarChart: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID="mock-bar-chart" />;
  },
}));

const mockNavigate = jest.fn();

const mockReport = {
  __typename: 'CareReport' as const,
  from: '2026-04-05T07:00:00.000Z',
  to: '2026-04-12T07:00:00.000Z',
  granularity: ReportGranularity.Day,
  totals: {
    __typename: 'ReportTotals' as const,
    totalFeeds: 42,
    totalMl: 5040,
    medianFeedsPerDay: 6,
    medianMlPerDay: 720,
    feedTypeBreakdown: [
      { __typename: 'FeedTypeCount' as const, feedType: FeedTypeEnum.Formula, count: 30 },
      { __typename: 'FeedTypeCount' as const, feedType: FeedTypeEnum.BreastMilk, count: 12 },
    ],
    totalDiaperChanges: 35,
    totalPoops: 14,
    totalPees: 21,
    medianDiapersPerDay: 5,
    totalSleepMinutes: 5880,
    medianSleepMinutesPerDay: 840,
    medianLongestStretchMinutes: 360,
    overnightStats: {
      __typename: 'OvernightSleepStats' as const,
      totalMinutes: 4200,
      medianMinutesPerNight: 600,
      medianLongestStretchMinutes: 540,
      medianBedtime: '20:00',
      medianBedtimeSampleCount: 5,
      medianWakeTime: '06:00',
      medianWakeTimeSampleCount: 5,
      count: 7,
    },
    napStats: {
      __typename: 'NapStats' as const,
      totalMinutes: 1680,
      medianNapsPerDay: 3,
      medianNapDurationMinutes: 40,
      count: 21,
    },
  },
  buckets: [
    { __typename: 'ReportBucket' as const, bucketStart: '2026-04-05T07:00:00.000Z', feeds: 6, ml: 720, diapers: 5, sleepMinutes: 840 },
    { __typename: 'ReportBucket' as const, bucketStart: '2026-04-06T07:00:00.000Z', feeds: 7, ml: 840, diapers: 4, sleepMinutes: 800 },
  ],
  hourlyPattern: [
    { __typename: 'HourlyBucket' as const, hour: 0, feeds: 1, sleepMinutes: 50, diapers: 0 },
    { __typename: 'HourlyBucket' as const, hour: 6, feeds: 3, sleepMinutes: 10, diapers: 2 },
    { __typename: 'HourlyBucket' as const, hour: 12, feeds: 4, sleepMinutes: 5, diapers: 3 },
    { __typename: 'HourlyBucket' as const, hour: 18, feeds: 2, sleepMinutes: 30, diapers: 1 },
  ],
  goalAdherence: {
    __typename: 'GoalAdherence' as const,
    wakeWindowAdherencePct: 85,
    feedIntervalAdherencePct: 72,
    napCountAdherencePct: null,
    bedtimeAdherenceMinutesAvg: 15,
  },
};

type RequestHandler = (variables: Record<string, unknown>) => { data: Record<string, unknown> };

function createMockLink(handler: RequestHandler): ApolloLink {
  return new ApolloLink((operation) => {
    return new Observable((observer) => {
      const result = handler(operation.variables as Record<string, unknown>);
      setTimeout(() => {
        observer.next(result);
        observer.complete();
      }, 0);
    });
  });
}

function createDelayedMockLink(): ApolloLink {
  return new ApolloLink(() => {
    return new Observable(() => {
      // Never resolves — simulates loading state
    });
  });
}

function renderScreen(link: ApolloLink) {
  const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });
  return render(
    <ApolloProvider client={client}>
      <ReportsScreen
        navigation={{ navigate: mockNavigate } as any}
        route={{ key: 'test', name: 'ReportsOverview' } as any}
      />
    </ApolloProvider>,
  );
}

describe('ReportsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    const { getByText } = renderScreen(createDelayedMockLink());
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders three summary cards with correct values', async () => {
    const link = createMockLink(() => ({ data: { careReport: mockReport } }));
    const { findByText } = renderScreen(link);

    // Feed card
    expect(await findByText('42')).toBeTruthy();
    expect(await findByText('feeds')).toBeTruthy();
    expect(await findByText('median 6/day')).toBeTruthy();

    // Diaper card
    expect(await findByText('35')).toBeTruthy();
    expect(await findByText('diapers')).toBeTruthy();
    expect(await findByText('median 5/day')).toBeTruthy();

    // Sleep card — 5880 minutes = 98h 0m
    expect(await findByText('98h')).toBeTruthy();
    expect(await findByText('sleep')).toBeTruthy();
    // median 840 minutes = 14h 0m
    expect(await findByText('median 14h/day')).toBeTruthy();
  });

  it('tapping feed card navigates to ReportDetail with FEED', async () => {
    const link = createMockLink(() => ({ data: { careReport: mockReport } }));
    const { findAllByTestId } = renderScreen(link);
    const cards = await findAllByTestId('summary-card');
    fireEvent.press(cards[0]);
    expect(mockNavigate).toHaveBeenCalledWith('ReportDetail', { activityType: 'FEED' });
  });

  it('tapping diaper card navigates to ReportDetail with DIAPER', async () => {
    const link = createMockLink(() => ({ data: { careReport: mockReport } }));
    const { findAllByTestId } = renderScreen(link);
    const cards = await findAllByTestId('summary-card');
    fireEvent.press(cards[1]);
    expect(mockNavigate).toHaveBeenCalledWith('ReportDetail', { activityType: 'DIAPER' });
  });

  it('tapping sleep card navigates to ReportDetail with SLEEP', async () => {
    const link = createMockLink(() => ({ data: { careReport: mockReport } }));
    const { findAllByTestId } = renderScreen(link);
    const cards = await findAllByTestId('summary-card');
    fireEvent.press(cards[2]);
    expect(mockNavigate).toHaveBeenCalledWith('ReportDetail', { activityType: 'SLEEP' });
  });

  it('renders trend chart section', async () => {
    const link = createMockLink(() => ({ data: { careReport: mockReport } }));
    const { findByText, findByTestId } = renderScreen(link);
    expect(await findByText('Trends')).toBeTruthy();
    expect(await findByTestId('trend-chart')).toBeTruthy();
  });

  it('renders daily pattern chart section', async () => {
    const link = createMockLink(() => ({ data: { careReport: mockReport } }));
    const { findByText, findByTestId } = renderScreen(link);
    expect(await findByText('Daily Pattern')).toBeTruthy();
    expect(await findByTestId('hourly-chart')).toBeTruthy();
  });

  it('renders goal adherence section when goalAdherence is present', async () => {
    const link = createMockLink(() => ({ data: { careReport: mockReport } }));
    const { findByText, findByTestId } = renderScreen(link);
    expect(await findByTestId('goal-adherence-section')).toBeTruthy();
    expect(await findByText('Goal Adherence')).toBeTruthy();
    expect(await findByText('Wake Window')).toBeTruthy();
    expect(await findByText('Feed Interval')).toBeTruthy();
  });

  it('hides goal adherence section when goalAdherence is null', async () => {
    const reportWithoutGoals = { ...mockReport, goalAdherence: null };
    const link = createMockLink(() => ({ data: { careReport: reportWithoutGoals } }));
    const { findByText, queryByTestId } = renderScreen(link);
    await findByText('42');
    expect(queryByTestId('goal-adherence-section')).toBeNull();
  });

  it('switching time range chip re-fetches with new variables', async () => {
    const capturedVariables: Record<string, unknown>[] = [];
    const link = createMockLink((variables) => {
      capturedVariables.push(variables);
      if (variables['granularity'] === ReportGranularity.Month) {
        return {
          data: {
            careReport: {
              ...mockReport,
              granularity: ReportGranularity.Month,
              totals: { ...mockReport.totals, totalFeeds: 150 },
            },
          },
        };
      }
      return { data: { careReport: mockReport } };
    });

    const { findByText, findByTestId } = renderScreen(link);

    // Wait for initial render with week data
    expect(await findByText('42')).toBeTruthy();

    // Switch to year (which uses Month granularity)
    const yearChip = await findByTestId('range-chip-year');
    fireEvent.press(yearChip);

    // Should re-fetch and show new data
    expect(await findByText('150')).toBeTruthy();

    // Verify the second request used Month granularity
    expect(capturedVariables.length).toBeGreaterThanOrEqual(2);
    expect(capturedVariables[capturedVariables.length - 1]['granularity']).toBe(ReportGranularity.Month);
  });
});
