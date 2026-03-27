import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { MigrationScreen } from './MigrationScreen';

// Mock Supabase
const mockSignUp = jest.fn();
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
  },
}));

// Mock useAuth
const mockLogin = jest.fn();
const mockClearLegacyAuth = jest.fn();
const mockLegacyAuthData = {
  familyId: 'family-123',
  caregiverId: 'caregiver-456',
  caregiverName: 'Mom',
  familyName: 'Smith Family',
  babyName: 'Baby Smith',
};
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    legacyAuthData: mockLegacyAuthData,
    clearLegacyAuth: mockClearLegacyAuth,
    login: mockLogin,
  }),
}));

// Mock Apollo useMutation
const mockLinkCaregiver = jest.fn();
jest.mock('@apollo/client/react', () => ({
  useMutation: () => [mockLinkCaregiver, { loading: false }],
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  setOptions: jest.fn(),
  setParams: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  getId: jest.fn(),
} as never;

const mockRoute = {
  key: 'Migration',
  name: 'Migration' as const,
  params: undefined,
};

jest.spyOn(Alert, 'alert');

describe('MigrationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null });
    mockLinkCaregiver.mockResolvedValue({
      data: {
        linkCaregiverToUser: {
          id: 'caregiver-456',
          name: 'Mom',
          deviceId: 'device-1',
          familyId: 'family-123',
        },
      },
    });
    mockLogin.mockResolvedValue(undefined);
    mockClearLegacyAuth.mockResolvedValue(undefined);
  });

  it('renders the migration form', () => {
    const { getByText, getByPlaceholderText } = render(
      <MigrationScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Upgrade Your Account')).toBeTruthy();
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(getByPlaceholderText('Minimum 6 characters')).toBeTruthy();
    expect(getByPlaceholderText('Re-enter your password')).toBeTruthy();
    expect(getByText('Create Account & Keep Data')).toBeTruthy();
    expect(getByText('Skip for now')).toBeTruthy();
  });

  it('shows family name in the description', () => {
    const { getByText } = render(
      <MigrationScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText(/Smith Family/)).toBeTruthy();
  });

  it('validates form fields', () => {
    const { getByText } = render(
      <MigrationScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Create Account & Keep Data'));

    expect(getByText('Email is required')).toBeTruthy();
    expect(getByText('Password is required')).toBeTruthy();
    expect(getByText('Please confirm your password')).toBeTruthy();
  });

  it('validates password mismatch', () => {
    const { getByText, getByPlaceholderText } = render(
      <MigrationScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Minimum 6 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'different');
    fireEvent.press(getByText('Create Account & Keep Data'));

    expect(getByText('Passwords do not match')).toBeTruthy();
  });

  it('performs full migration flow on valid submit', async () => {
    const { getByText, getByPlaceholderText } = render(
      <MigrationScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Minimum 6 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'password123');
    fireEvent.press(getByText('Create Account & Keep Data'));

    await waitFor(() => {
      // Step 1: Supabase sign up
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      // Step 2: Link caregiver
      expect(mockLinkCaregiver).toHaveBeenCalledWith({
        variables: { caregiverId: 'caregiver-456' },
      });
    });

    await waitFor(() => {
      // Step 3: Update auth (family data is preserved in storage)
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('shows alert on Supabase sign up error', async () => {
    mockSignUp.mockResolvedValue({
      error: { message: 'Email already in use' },
    });

    const { getByText, getByPlaceholderText } = render(
      <MigrationScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Minimum 6 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'password123');
    fireEvent.press(getByText('Create Account & Keep Data'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Sign Up Failed', 'Email already in use');
    });

    // Should NOT proceed to link caregiver
    expect(mockLinkCaregiver).not.toHaveBeenCalled();
  });

  it('navigates to SignIn when link is pressed', () => {
    const { getByText } = render(
      <MigrationScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });

  it('navigates to Dashboard when skip is pressed', () => {
    const { getByText } = render(
      <MigrationScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Skip for now'));
    expect(mockNavigate).toHaveBeenCalledWith('Dashboard');
  });
});
