import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StackHeaderProps } from '@react-navigation/stack';
import { CustomHeader } from './CustomHeader';

// Mock useAuth
const mockAuthData = {
  babyName: 'Luna',
  familyId: 'family-1',
  caregiverId: 'caregiver-1',
  caregiverName: 'Mom',
  familyName: 'Test Family',
};
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    authData: mockAuthData,
  }),
}));

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock Apollo useQuery
let mockPredictionData: { predictNextFeed: { minutesUntilFeed: number } | null } | undefined;
jest.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: mockPredictionData,
    loading: false,
    error: undefined,
  }),
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Plus: () => 'Plus',
  Calendar: () => 'Calendar',
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

function createHeaderProps(routeName: string, title?: string): StackHeaderProps {
  return ({
    navigation: {
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
      dispatch: jest.fn(),
      reset: jest.fn(),
      isFocused: jest.fn(),
      getParent: jest.fn(),
      getState: jest.fn(),
      setOptions: jest.fn(),
      setParams: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      getId: jest.fn(),
    } as unknown as StackHeaderProps['navigation'],
    route: {
      key: routeName,
      name: routeName,
      params: undefined,
    } as StackHeaderProps['route'],
    options: {
      title,
    } as StackHeaderProps['options'],
    layout: { width: 375, height: 812 },
    back: routeName !== 'Dashboard' ? { title: 'Back', href: undefined } : undefined,
  } as unknown) as StackHeaderProps;
}

describe('CustomHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPredictionData = undefined;
    mockCanGoBack.mockReturnValue(false);
  });

  describe('Dashboard screen', () => {
    it('renders [+] icon on the left', () => {
      const { getByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      expect(getByTestId('log-activity-button')).toBeTruthy();
    });

    it('renders calendar icon on the right', () => {
      const { getByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      expect(getByTestId('upcoming-button')).toBeTruthy();
    });

    it('[+] navigates to LogActivity', () => {
      const { getByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      fireEvent.press(getByTestId('log-activity-button'));
      expect(mockNavigate).toHaveBeenCalledWith('LogActivity');
    });

    it('calendar navigates to Upcoming', () => {
      const { getByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      fireEvent.press(getByTestId('upcoming-button'));
      expect(mockNavigate).toHaveBeenCalledWith('Upcoming');
    });

    it('shows baby name centered', () => {
      const { getByText } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      expect(getByText(/Luna's Baton/)).toBeTruthy();
    });

    it('does not render caregiver avatar', () => {
      const { queryByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      expect(queryByTestId('caregiver-avatar')).toBeNull();
    });
  });

  describe('non-Dashboard screen', () => {
    it('shows back button and no action icons', () => {
      mockCanGoBack.mockReturnValue(true);
      const { queryByTestId } = render(
        <CustomHeader {...createHeaderProps('PredictionDetail', 'Prediction Details')} />
      );
      expect(queryByTestId('log-activity-button')).toBeNull();
      expect(queryByTestId('upcoming-button')).toBeNull();
    });

    it('back button calls goBack', () => {
      mockCanGoBack.mockReturnValue(true);
      const { getByText } = render(
        <CustomHeader {...createHeaderProps('PredictionDetail', 'Prediction Details')} />
      );
      fireEvent.press(getByText('←'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('red dot badge', () => {
    it('shows red dot when minutesUntilFeed <= 10', () => {
      mockPredictionData = { predictNextFeed: { minutesUntilFeed: 5 } };
      const { getByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      expect(getByTestId('upcoming-badge')).toBeTruthy();
    });

    it('shows red dot when minutesUntilFeed is 0', () => {
      mockPredictionData = { predictNextFeed: { minutesUntilFeed: 0 } };
      const { getByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      expect(getByTestId('upcoming-badge')).toBeTruthy();
    });

    it('shows red dot when minutesUntilFeed is negative', () => {
      mockPredictionData = { predictNextFeed: { minutesUntilFeed: -3 } };
      const { getByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      expect(getByTestId('upcoming-badge')).toBeTruthy();
    });

    it('hides red dot when minutesUntilFeed > 10', () => {
      mockPredictionData = { predictNextFeed: { minutesUntilFeed: 30 } };
      const { queryByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      expect(queryByTestId('upcoming-badge')).toBeNull();
    });

    it('hides red dot when no prediction data', () => {
      mockPredictionData = undefined;
      const { queryByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      expect(queryByTestId('upcoming-badge')).toBeNull();
    });
  });
});
