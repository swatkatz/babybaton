import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SummaryCard } from './SummaryCard';

jest.mock('../theme/colors', () => ({
  colors: {
    surface: '#FFFFFF',
    primary: '#5B9BD5',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    textLight: '#A8B4C0',
  },
}));

describe('SummaryCard', () => {
  const defaultProps = {
    icon: '🍼',
    value: '8',
    label: 'Total Feeds',
    subtitle: 'avg 6/day',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders icon, value, label, and subtitle', () => {
    const { getByText } = render(<SummaryCard {...defaultProps} />);
    expect(getByText('🍼')).toBeTruthy();
    expect(getByText('8')).toBeTruthy();
    expect(getByText('Total Feeds')).toBeTruthy();
    expect(getByText('avg 6/day')).toBeTruthy();
  });

  it('renders chevron indicator', () => {
    const { getByText } = render(<SummaryCard {...defaultProps} />);
    expect(getByText('>')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SummaryCard {...defaultProps} onPress={onPress} />
    );
    fireEvent.press(getByTestId('summary-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
