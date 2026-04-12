import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TimeRangeChips, TimeRange } from './TimeRangeChips';

jest.mock('../theme/colors', () => ({
  colors: {
    background: '#F8F9FA',
    border: '#E1E8ED',
    textSecondary: '#7F8C9A',
    primary: '#5B9BD5',
  },
}));

describe('TimeRangeChips', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 4 range chips', () => {
    const { getByText } = render(
      <TimeRangeChips selected="day" onSelect={onSelect} />
    );
    expect(getByText('Day')).toBeTruthy();
    expect(getByText('Week')).toBeTruthy();
    expect(getByText('Month')).toBeTruthy();
    expect(getByText('Year')).toBeTruthy();
  });

  it('applies selected style to active chip', () => {
    const { getByTestId } = render(
      <TimeRangeChips selected="week" onSelect={onSelect} />
    );
    const weekChip = getByTestId('range-chip-week');
    // The selected chip should have the chipSelected style applied
    expect(weekChip.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#5B9BD5' })
    );
  });

  it('calls onSelect with correct range value on press', () => {
    const { getByText } = render(
      <TimeRangeChips selected="day" onSelect={onSelect} />
    );

    fireEvent.press(getByText('Week'));
    expect(onSelect).toHaveBeenCalledWith('week');

    fireEvent.press(getByText('Month'));
    expect(onSelect).toHaveBeenCalledWith('month');

    fireEvent.press(getByText('Year'));
    expect(onSelect).toHaveBeenCalledWith('year');
  });

  it('calls onSelect with day when Day chip is pressed', () => {
    const { getByText } = render(
      <TimeRangeChips selected="month" onSelect={onSelect} />
    );

    fireEvent.press(getByText('Day'));
    expect(onSelect).toHaveBeenCalledWith('day');
  });
});
