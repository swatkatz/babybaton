import React from 'react';
import { render } from '@testing-library/react-native';
import { TrendChart } from './TrendChart';
import { ReportBucket } from '../types/__generated__/graphql';

jest.mock('../theme/colors', () => ({
  colors: {
    border: '#E1E8ED',
    textSecondary: '#7F8C9A',
  },
}));

jest.mock('react-native-gifted-charts', () => ({
  BarChart: ({ data, ...props }: { data: Array<{ value: number; frontColor: string; label: string }>; [key: string]: unknown }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="mock-bar-chart">
        {data.map((item: { value: number; frontColor: string; label: string }, i: number) => (
          <Text key={i} testID={`bar-${i}`}>
            {`${item.value}:${item.frontColor}:${item.label}`}
          </Text>
        ))}
      </View>
    );
  },
}));

const makeBucket = (overrides: Partial<ReportBucket> & { bucketStart: string }): ReportBucket => ({
  __typename: 'ReportBucket',
  feeds: 0,
  ml: 0,
  diapers: 0,
  sleepMinutes: 0,
  ...overrides,
});

describe('TrendChart', () => {
  it('renders empty state when buckets is empty', () => {
    const { getByTestId } = render(
      <TrendChart buckets={[]} metric="feeds" color="#5B9BD5" />
    );
    expect(getByTestId('trend-chart-empty')).toBeTruthy();
  });

  it('renders bar chart with correct data transformation', () => {
    const buckets = [
      makeBucket({ bucketStart: '2026-04-10T00:00:00Z', feeds: 6, ml: 500 }),
      makeBucket({ bucketStart: '2026-04-11T00:00:00Z', feeds: 8, ml: 700 }),
    ];

    const { getByTestId } = render(
      <TrendChart buckets={buckets} metric="feeds" color="#5B9BD5" />
    );
    expect(getByTestId('trend-chart')).toBeTruthy();
    expect(getByTestId('mock-bar-chart')).toBeTruthy();

    // Verify data values are correct
    const bar0 = getByTestId('bar-0');
    expect(bar0.props.children).toContain('6');
    expect(bar0.props.children).toContain('#5B9BD5');

    const bar1 = getByTestId('bar-1');
    expect(bar1.props.children).toContain('8');
  });

  it('maps the correct metric to bar values', () => {
    const buckets = [
      makeBucket({ bucketStart: '2026-04-10T00:00:00Z', feeds: 6, ml: 500, diapers: 3, sleepMinutes: 120 }),
    ];

    const { getByTestId, rerender } = render(
      <TrendChart buckets={buckets} metric="ml" color="#AAA" />
    );
    expect(getByTestId('bar-0').props.children).toContain('500');

    rerender(<TrendChart buckets={buckets} metric="diapers" color="#BBB" />);
    expect(getByTestId('bar-0').props.children).toContain('3');

    rerender(<TrendChart buckets={buckets} metric="sleepMinutes" color="#CCC" />);
    expect(getByTestId('bar-0').props.children).toContain('120');
  });
});
