import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ApolloClient, InMemoryCache, ApolloLink, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { ReportDetailScreen } from './ReportDetailScreen';
import {
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

const mockSetOptions = jest.fn();

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
      medianWakeTime: '07:00',
      medianWakeTimeSampleCount: 5,
      count: 7,
    },
    napStats: {
      __typename: 'NapStats' as const,
      totalMinutes: 1680,
      medianNapsPerDay: 2,
      medianNapDurationMinutes: 45,
      count: 14,
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
    napCountAdherencePct: 60,
    bedtimeAdherenceMinutesAvg: 15,
    wakeTimeAdherenceMinutesAvg: 10,
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

function renderScreen(activityType: 'FEED' | 'DIAPER' | 'SLEEP', link: ApolloLink) {
  const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });
  return render(
    <ApolloProvider client={client}>
      <ReportDetailScreen
        navigation={{ setOptions: mockSetOptions } as any}
        route={{ key: 'test', name: 'ReportDetail', params: { activityType } } as any}
      />
    </ApolloProvider>,
  );
}

describe('ReportDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Feed detail', () => {
    it('sets navigation title to Feeding Report', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText } = renderScreen('FEED', link);
      await findByText('42');
      expect(mockSetOptions).toHaveBeenCalledWith({ title: '🍼 Feeding Report' });
    });

    it('renders total feeds, median/day, median ml/day', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText } = renderScreen('FEED', link);
      expect(await findByText('42')).toBeTruthy();
      expect(await findByText('total feeds')).toBeTruthy();
      expect(await findByText('6.0')).toBeTruthy();
      expect(await findByText('median/day')).toBeTruthy();
      expect(await findByText('720')).toBeTruthy();
      expect(await findByText('median ml/day')).toBeTruthy();
    });

    it('shows TypeBreakdownBar', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByTestId } = renderScreen('FEED', link);
      expect(await findByTestId('type-breakdown-bar')).toBeTruthy();
    });

    it('shows feed interval goal adherence', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText } = renderScreen('FEED', link);
      expect(await findByText('Feed Interval')).toBeTruthy();
    });
  });

  describe('Sleep detail', () => {
    it('sets navigation title to Sleep Report', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText } = renderScreen('SLEEP', link);
      await findByText('98h');
      expect(mockSetOptions).toHaveBeenCalledWith({ title: '😴 Sleep Report' });
    });

    it('renders total sleep hours, median/day, median stretch', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText, findAllByText } = renderScreen('SLEEP', link);
      expect(await findByText('98h')).toBeTruthy();
      expect(await findByText('total sleep')).toBeTruthy();
      expect(await findByText('14h')).toBeTruthy();
      expect((await findAllByText('median/day')).length).toBeGreaterThanOrEqual(1);
      expect(await findByText('6h')).toBeTruthy();
      expect(await findByText('median stretch')).toBeTruthy();
    });

    it('renders Overnight section with overnight stats', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByTestId, findByText } = renderScreen('SLEEP', link);
      expect(await findByTestId('overnight-section')).toBeTruthy();
      expect(await findByText('Overnight')).toBeTruthy();
      expect(await findByText('70h')).toBeTruthy(); // 4200 min = 70h
      expect(await findByText('total overnight')).toBeTruthy();
      expect(await findByText('10h')).toBeTruthy(); // 600 min = 10h
      expect(await findByText('median/night')).toBeTruthy();
      expect(await findByText('20:00')).toBeTruthy();
      expect(await findByText('median bedtime (5 nights)')).toBeTruthy();
      expect(await findByText('07:00')).toBeTruthy();
      expect(await findByText('median wake (5 nights)')).toBeTruthy();
    });

    it('renders Naps section with nap stats', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByTestId, findByText } = renderScreen('SLEEP', link);
      expect(await findByTestId('naps-section')).toBeTruthy();
      expect(await findByText('Naps')).toBeTruthy();
      expect(await findByText('14')).toBeTruthy(); // count
      expect(await findByText('total naps')).toBeTruthy();
      expect(await findByText('2.0')).toBeTruthy(); // medianNapsPerDay
      expect(await findByText('45m')).toBeTruthy(); // 45 min duration
      expect(await findByText('median duration')).toBeTruthy();
    });

    it('shows nap count goal adherence in naps section', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText, findByTestId } = renderScreen('SLEEP', link);
      expect(await findByTestId('nap-goals')).toBeTruthy();
      expect(await findByText('Nap Count')).toBeTruthy();
    });

    it('shows bedtime and wake time goals in overnight section', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText, findByTestId } = renderScreen('SLEEP', link);
      expect(await findByTestId('overnight-goals')).toBeTruthy();
      expect(await findByText('Bedtime')).toBeTruthy();
      expect(await findByText('Wake Time')).toBeTruthy();
    });

    it('does not show TypeBreakdownBar', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText, queryByTestId } = renderScreen('SLEEP', link);
      await findByText('98h');
      expect(queryByTestId('type-breakdown-bar')).toBeNull();
    });

    it('does not show generic goal adherence section', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText, queryByTestId } = renderScreen('SLEEP', link);
      await findByText('98h');
      expect(queryByTestId('goal-adherence-section')).toBeNull();
    });
  });

  describe('Diaper detail', () => {
    it('sets navigation title to Diaper Report', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText } = renderScreen('DIAPER', link);
      await findByText('35');
      expect(mockSetOptions).toHaveBeenCalledWith({ title: '💩 Diaper Report' });
    });

    it('renders total changes, poops, pees', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText } = renderScreen('DIAPER', link);
      expect(await findByText('35')).toBeTruthy();
      expect(await findByText('total changes')).toBeTruthy();
      expect(await findByText('14')).toBeTruthy();
      expect(await findByText('poops')).toBeTruthy();
      expect(await findByText('21')).toBeTruthy();
      expect(await findByText('pees')).toBeTruthy();
    });

    it('does not show TypeBreakdownBar', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText, queryByTestId } = renderScreen('DIAPER', link);
      await findByText('35');
      expect(queryByTestId('type-breakdown-bar')).toBeNull();
    });

    it('does not show goal adherence section', async () => {
      const link = createMockLink(() => ({ data: { careReport: mockReport } }));
      const { findByText, queryByTestId } = renderScreen('DIAPER', link);
      await findByText('35');
      expect(queryByTestId('goal-adherence-section')).toBeNull();
    });
  });

  describe('TypeBreakdownBar hides segments <1%', () => {
    it('only shows formula when breast milk count is 0', async () => {
      const reportWithSkewedBreakdown = {
        ...mockReport,
        totals: {
          ...mockReport.totals,
          feedTypeBreakdown: [
            { __typename: 'FeedTypeCount' as const, feedType: FeedTypeEnum.Formula, count: 100 },
            { __typename: 'FeedTypeCount' as const, feedType: FeedTypeEnum.BreastMilk, count: 0 },
          ],
        },
      };
      const link = createMockLink(() => ({ data: { careReport: reportWithSkewedBreakdown } }));
      const { findByTestId, queryByTestId } = renderScreen('FEED', link);
      expect(await findByTestId('segment-FORMULA')).toBeTruthy();
      expect(queryByTestId('segment-BREAST_MILK')).toBeNull();
    });
  });

  describe('Goal adherence hidden when null', () => {
    it('hides goal section when goalAdherence is null', async () => {
      const reportWithoutGoals = { ...mockReport, goalAdherence: null };
      const link = createMockLink(() => ({ data: { careReport: reportWithoutGoals } }));
      const { findByText, queryByTestId } = renderScreen('FEED', link);
      await findByText('42');
      expect(queryByTestId('goal-adherence-section')).toBeNull();
    });
  });

  describe('Time range chips', () => {
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

      const { findByText, findByTestId } = renderScreen('FEED', link);
      expect(await findByText('42')).toBeTruthy();

      const yearChip = await findByTestId('range-chip-year');
      fireEvent.press(yearChip);

      expect(await findByText('150')).toBeTruthy();
      expect(capturedVariables.length).toBeGreaterThanOrEqual(2);
      expect(capturedVariables[capturedVariables.length - 1]['granularity']).toBe(ReportGranularity.Month);
    });
  });

  it('renders trend chart section', async () => {
    const link = createMockLink(() => ({ data: { careReport: mockReport } }));
    const { findByText, findByTestId } = renderScreen('FEED', link);
    expect(await findByText('Trends')).toBeTruthy();
    expect(await findByTestId('trend-chart')).toBeTruthy();
  });

  it('renders hourly pattern chart section', async () => {
    const link = createMockLink(() => ({ data: { careReport: mockReport } }));
    const { findByText, findByTestId } = renderScreen('FEED', link);
    expect(await findByText('Daily Pattern')).toBeTruthy();
    expect(await findByTestId('hourly-chart')).toBeTruthy();
  });
});
