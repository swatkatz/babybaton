import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CompactCurrentSessionCard } from './CompactCurrentSessionCard';

jest.mock('lucide-react-native', () => ({
  ChevronRight: () => 'ChevronRight',
}));

jest.mock('../theme/colors', () => ({
  colors: {
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    textLight: '#A8B4C0',
    success: '#7BC96F',
  },
  getCaregiverColor: jest.fn(() => ({ bg: '#CFE2FF', text: '#0D6EFD' })),
}));

jest.mock('../utils/time', () => ({
  formatTime: jest.fn(() => '10:00 AM'),
}));

describe('CompactCurrentSessionCard', () => {
  const defaultProps = {
    caregiverName: 'Swati',
    caregiverId: 'cg-1',
    startedAt: '2025-01-15T10:00:00Z',
    activityCount: 5,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders green dot indicator', () => {
    const { getByTestId } = render(
      <CompactCurrentSessionCard {...defaultProps} />
    );
    expect(getByTestId('active-indicator')).toBeTruthy();
  });

  it('renders caregiver name', () => {
    const { getByText } = render(
      <CompactCurrentSessionCard {...defaultProps} />
    );
    expect(getByText('Swati')).toBeTruthy();
  });

  it('renders start time and activity count', () => {
    const { getByText } = render(
      <CompactCurrentSessionCard {...defaultProps} />
    );
    expect(getByText(/10:00 AM - now/)).toBeTruthy();
    expect(getByText('5 activities')).toBeTruthy();
  });

  it('uses singular "activity" for count of 1', () => {
    const { getByText } = render(
      <CompactCurrentSessionCard {...defaultProps} activityCount={1} />
    );
    expect(getByText('1 activity')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const { getByTestId } = render(
      <CompactCurrentSessionCard {...defaultProps} />
    );
    fireEvent.press(getByTestId('compact-current-session'));
    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('does NOT render full activity list', () => {
    const { queryByText } = render(
      <CompactCurrentSessionCard {...defaultProps} />
    );
    // Should not render any activity details like "Fed" or "Changed diaper"
    expect(queryByText(/Fed/)).toBeNull();
    expect(queryByText(/Changed diaper/)).toBeNull();
    expect(queryByText(/Sleeping/)).toBeNull();
  });
});
