import React from 'react';
import { render } from '@testing-library/react-native';
import { HourlyPatternChart } from './HourlyPatternChart';
import { HourlyBucket } from '../types/__generated__/graphql';

jest.mock('../theme/colors', () => ({
  colors: {
    feed: '#5B9BD5',
    sleep: '#B19CD9',
    diaper: '#FFB6A3',
    border: '#E1E8ED',
    textSecondary: '#7F8C9A',
  },
}));

let lastBarChartProps: { data?: Array<{ value: number; frontColor: string }>; stackData?: Array<{ stacks: Array<{ value: number; color: string }> }> } | null = null;

jest.mock('react-native-gifted-charts', () => ({
  BarChart: (props: { data?: Array<{ value: number; frontColor: string }>; stackData?: Array<{ stacks: Array<{ value: number; color: string }> }> }) => {
    lastBarChartProps = props;
    const { View, Text } = require('react-native');
    if (props.data) {
      return (
        <View testID="mock-bar-chart">
          {props.data.map((item: { value: number; frontColor: string }, i: number) => (
            <Text key={i} testID={`bar-${i}`}>{`${item.value}:${item.frontColor}`}</Text>
          ))}
        </View>
      );
    }
    if (props.stackData) {
      return (
        <View testID="mock-stacked-chart">
          {props.stackData.map((item: { stacks: Array<{ value: number; color: string }> }, i: number) => (
            <Text key={i} testID={`stack-${i}`}>
              {item.stacks.map((s: { value: number; color: string }) => `${s.value}:${s.color}`).join('|')}
            </Text>
          ))}
        </View>
      );
    }
    return <View />;
  },
}));

function makeHourlyBuckets(count: number = 24): HourlyBucket[] {
  return Array.from({ length: count }, (_, i) => ({
    __typename: 'HourlyBucket' as const,
    hour: i,
    feeds: i % 3 === 0 ? 2 : 0,
    sleepMinutes: i < 7 || i > 20 ? 30 : 0,
    diapers: i % 4 === 0 ? 1 : 0,
  }));
}

describe('HourlyPatternChart', () => {
  beforeEach(() => {
    lastBarChartProps = null;
  });

  it('renders 24 bars for single activity type', () => {
    const buckets = makeHourlyBuckets();
    const { getByTestId, getAllByTestId } = render(
      <HourlyPatternChart hourlyPattern={buckets} activityType="FEED" />
    );
    expect(getByTestId('hourly-chart')).toBeTruthy();
    expect(getByTestId('mock-bar-chart')).toBeTruthy();
    // Should have 24 bars
    const bars = getAllByTestId(/^bar-/);
    expect(bars).toHaveLength(24);
  });

  it('uses correct color for FEED type', () => {
    const buckets = makeHourlyBuckets();
    render(
      <HourlyPatternChart hourlyPattern={buckets} activityType="FEED" />
    );
    expect(lastBarChartProps?.data?.[0].frontColor).toBe('#5B9BD5');
  });

  it('uses correct color for SLEEP type', () => {
    const buckets = makeHourlyBuckets();
    render(
      <HourlyPatternChart hourlyPattern={buckets} activityType="SLEEP" />
    );
    expect(lastBarChartProps?.data?.[0].frontColor).toBe('#B19CD9');
  });

  it('uses correct color for DIAPER type', () => {
    const buckets = makeHourlyBuckets();
    render(
      <HourlyPatternChart hourlyPattern={buckets} activityType="DIAPER" />
    );
    expect(lastBarChartProps?.data?.[0].frontColor).toBe('#FFB6A3');
  });

  it('filters to single activity type data when activityType is specified', () => {
    const buckets: HourlyBucket[] = [
      { __typename: 'HourlyBucket', hour: 0, feeds: 5, sleepMinutes: 30, diapers: 2 },
      { __typename: 'HourlyBucket', hour: 1, feeds: 3, sleepMinutes: 60, diapers: 1 },
    ];
    render(
      <HourlyPatternChart hourlyPattern={buckets} activityType="FEED" />
    );
    expect(lastBarChartProps?.data?.[0].value).toBe(5);
    expect(lastBarChartProps?.data?.[1].value).toBe(3);
  });

  it('renders stacked bars in overview mode (no activityType)', () => {
    const buckets = makeHourlyBuckets();
    const { getByTestId, getAllByTestId } = render(
      <HourlyPatternChart hourlyPattern={buckets} />
    );
    expect(getByTestId('hourly-chart')).toBeTruthy();
    expect(getByTestId('mock-stacked-chart')).toBeTruthy();
    const stacks = getAllByTestId(/^stack-/);
    expect(stacks).toHaveLength(24);
  });

  it('renders legend in overview mode', () => {
    const buckets = makeHourlyBuckets();
    const { getByText } = render(
      <HourlyPatternChart hourlyPattern={buckets} />
    );
    expect(getByText('Feed')).toBeTruthy();
    expect(getByText('Sleep')).toBeTruthy();
    expect(getByText('Diaper')).toBeTruthy();
  });
});
