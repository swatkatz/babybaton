import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { SignUpScreen } from './SignUpScreen';

// Mock Supabase
const mockSignUp = jest.fn();
const mockSignInWithOAuth = jest.fn();
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  },
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
  key: 'SignUp',
  name: 'SignUp' as const,
  params: undefined,
};

jest.spyOn(Alert, 'alert');

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null });
    mockSignInWithOAuth.mockResolvedValue({ error: null });
  });

  it('renders all form fields and buttons', () => {
    const { getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Create Account')).toBeTruthy();
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(getByPlaceholderText('Minimum 6 characters')).toBeTruthy();
    expect(getByPlaceholderText('Re-enter your password')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
    expect(getByText('Sign up with Google')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('shows validation errors when submitting empty form', () => {
    const { getByText } = render(
      <SignUpScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Sign Up'));

    expect(getByText('Email is required')).toBeTruthy();
    expect(getByText('Password is required')).toBeTruthy();
    expect(getByText('Please confirm your password')).toBeTruthy();
  });

  it('shows error for invalid email', () => {
    const { getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'notanemail');
    fireEvent.changeText(getByPlaceholderText('Minimum 6 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    expect(getByText('Please enter a valid email')).toBeTruthy();
  });

  it('shows error when passwords do not match', () => {
    const { getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Minimum 6 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'different');
    fireEvent.press(getByText('Sign Up'));

    expect(getByText('Passwords do not match')).toBeTruthy();
  });

  it('shows error for short password', () => {
    const { getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Minimum 6 characters'), '12345');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), '12345');
    fireEvent.press(getByText('Sign Up'));

    expect(getByText('Password must be at least 6 characters')).toBeTruthy();
  });

  it('calls supabase signUp with correct params on valid submit', async () => {
    const { getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Minimum 6 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows alert on supabase sign up error', async () => {
    mockSignUp.mockResolvedValue({
      error: { message: 'User already registered' },
    });

    const { getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Minimum 6 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'password123');
    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Sign Up Failed', 'User already registered');
    });
  });

  it('calls supabase signInWithOAuth for Google sign up', async () => {
    const { getByText } = render(
      <SignUpScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Sign up with Google'));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({ provider: 'google' });
    });
  });

  it('navigates to Sign In screen when link is pressed', () => {
    const { getByText } = render(
      <SignUpScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Sign In'));

    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });

  it('clears field errors when user types', () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <SignUpScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Trigger validation
    fireEvent.press(getByText('Sign Up'));
    expect(getByText('Email is required')).toBeTruthy();

    // Type in email field
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 't');
    expect(queryByText('Email is required')).toBeNull();
  });
});
