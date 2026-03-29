import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StackHeaderProps } from '@react-navigation/stack';
import { CustomHeader } from './CustomHeader';
import predictionReadService from '../services/predictionReadService';

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

// Mock navigation focus effect — execute immediately
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    callback();
  },
}));

// Mock predictionReadService
jest.mock('../services/predictionReadService', () => ({
  __esModule: true,
  default: {
    isRead: jest.fn().mockResolvedValue(false),
    markAsRead: jest.fn().mockResolvedValue(undefined),
    hasAnyUnread: jest.fn().mockResolvedValue(false),
  },
}));

// Mock Apollo useQuery
let mockPredictionData: { predictNextFeed: { predictedTime: string; minutesUntilFeed: number } | null } | undefined;
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
    (predictionReadService.hasAnyUnread as jest.Mock).mockResolvedValue(false);
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
        <CustomHeader {...createHeaderProps('CurrentSessionDetail', 'Ongoing Session')} />
      );
      expect(queryByTestId('log-activity-button')).toBeNull();
      expect(queryByTestId('upcoming-button')).toBeNull();
    });

    it('back button calls goBack', () => {
      mockCanGoBack.mockReturnValue(true);
      const { getByText } = render(
        <CustomHeader {...createHeaderProps('CurrentSessionDetail', 'Ongoing Session')} />
      );
      fireEvent.press(getByText('←'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('red dot badge', () => {
    it('shows red dot when prediction is unread', async () => {
      mockPredictionData = { predictNextFeed: { predictedTime: '2026-03-29T18:30:00Z', minutesUntilFeed: 5 } };
      (predictionReadService.hasAnyUnread as jest.Mock).mockResolvedValue(true);
      const { findByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      expect(await findByTestId('upcoming-badge')).toBeTruthy();
    });

    it('hides red dot when prediction is read', async () => {
      mockPredictionData = { predictNextFeed: { predictedTime: '2026-03-29T18:30:00Z', minutesUntilFeed: 5 } };
      (predictionReadService.hasAnyUnread as jest.Mock).mockResolvedValue(false);
      const { queryByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      await waitFor(() => {
        expect(queryByTestId('upcoming-badge')).toBeNull();
      });
    });

    it('hides red dot when no prediction data', async () => {
      mockPredictionData = undefined;
      (predictionReadService.hasAnyUnread as jest.Mock).mockResolvedValue(false);
      const { queryByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      await waitFor(() => {
        expect(queryByTestId('upcoming-badge')).toBeNull();
      });
    });

    it('checks read state using predictionReadService', async () => {
      mockPredictionData = { predictNextFeed: { predictedTime: '2026-03-29T18:30:00Z', minutesUntilFeed: 30 } };
      (predictionReadService.hasAnyUnread as jest.Mock).mockResolvedValue(true);
      const { findByTestId } = render(
        <CustomHeader {...createHeaderProps('Dashboard')} />
      );
      await findByTestId('upcoming-badge');
      expect(predictionReadService.hasAnyUnread).toHaveBeenCalledWith('2026-03-29T18:30:00Z');
    });
  });
});
