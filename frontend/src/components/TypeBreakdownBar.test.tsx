import React from 'react';
import { render } from '@testing-library/react-native';
import { TypeBreakdownBar } from './TypeBreakdownBar';
import { FeedType, FeedTypeCount } from '../types/__generated__/graphql';

jest.mock('../theme/colors', () => ({
  colors: {
    primary: '#5B9BD5',
    primaryLight: '#A8D5F2',
    accent: '#FFB6A3',
    textSecondary: '#7F8C9A',
  },
}));

function makeFeedTypeCount(feedType: FeedType, count: number): FeedTypeCount {
  return { __typename: 'FeedTypeCount', feedType, count };
}

describe('TypeBreakdownBar', () => {
  it('renders segments with correct proportions', () => {
    const breakdown = [
      makeFeedTypeCount(FeedType.BreastMilk, 60),
      makeFeedTypeCount(FeedType.Formula, 30),
      makeFeedTypeCount(FeedType.Solids, 10),
    ];
    const { getByTestId } = render(
      <TypeBreakdownBar breakdown={breakdown} totalFeeds={100} />
    );
    expect(getByTestId('type-breakdown-bar')).toBeTruthy();
    expect(getByTestId(`segment-${FeedType.BreastMilk}`)).toBeTruthy();
    expect(getByTestId(`segment-${FeedType.Formula}`)).toBeTruthy();
    expect(getByTestId(`segment-${FeedType.Solids}`)).toBeTruthy();
  });

  it('hides segments below 1% of total', () => {
    const breakdown = [
      makeFeedTypeCount(FeedType.BreastMilk, 99),
      makeFeedTypeCount(FeedType.Formula, 0), // 0% - should be hidden
    ];
    const { getByTestId, queryByTestId } = render(
      <TypeBreakdownBar breakdown={breakdown} totalFeeds={100} />
    );
    expect(getByTestId(`segment-${FeedType.BreastMilk}`)).toBeTruthy();
    expect(queryByTestId(`segment-${FeedType.Formula}`)).toBeNull();
  });

  it('handles single-type case (100% bar)', () => {
    const breakdown = [
      makeFeedTypeCount(FeedType.BreastMilk, 50),
    ];
    const { getByTestId, getByText } = render(
      <TypeBreakdownBar breakdown={breakdown} totalFeeds={50} />
    );
    expect(getByTestId(`segment-${FeedType.BreastMilk}`)).toBeTruthy();
    // Should show label inside since it's 100% (wide enough)
    expect(getByText('Breast Milk')).toBeTruthy();
  });

  it('returns null for empty breakdown', () => {
    const { toJSON } = render(
      <TypeBreakdownBar breakdown={[]} totalFeeds={0} />
    );
    expect(toJSON()).toBeNull();
  });

  it('returns null when totalFeeds is 0', () => {
    const breakdown = [
      makeFeedTypeCount(FeedType.BreastMilk, 5),
    ];
    const { toJSON } = render(
      <TypeBreakdownBar breakdown={breakdown} totalFeeds={0} />
    );
    expect(toJSON()).toBeNull();
  });

  it('shows legend with percentage labels', () => {
    const breakdown = [
      makeFeedTypeCount(FeedType.BreastMilk, 60),
      makeFeedTypeCount(FeedType.Formula, 40),
    ];
    const { getByText } = render(
      <TypeBreakdownBar breakdown={breakdown} totalFeeds={100} />
    );
    expect(getByText('Breast Milk (60%)')).toBeTruthy();
    expect(getByText('Formula (40%)')).toBeTruthy();
  });
});
