import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterChips } from './FilterChips';
import { ActivityType } from '../types/__generated__/graphql';

jest.mock('../theme/colors', () => ({
  colors: {
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textSecondary: '#7F8C9A',
    primary: '#5B9BD5',
  },
}));

describe('FilterChips', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders 4 chips: All, Feed, Diaper, Sleep', () => {
    const { getByText } = render(
      <FilterChips selected="ALL" onSelect={onSelect} />
    );
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Feed')).toBeTruthy();
    expect(getByText('Diaper')).toBeTruthy();
    expect(getByText('Sleep')).toBeTruthy();
  });

  it('calls onSelect with correct filter type on press', () => {
    const { getByText } = render(
      <FilterChips selected="ALL" onSelect={onSelect} />
    );
    fireEvent.press(getByText('Feed'));
    expect(onSelect).toHaveBeenCalledWith(ActivityType.Feed);

    fireEvent.press(getByText('Sleep'));
    expect(onSelect).toHaveBeenCalledWith(ActivityType.Sleep);
  });
});
