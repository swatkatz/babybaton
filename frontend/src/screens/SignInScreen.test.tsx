import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SignInScreen } from './SignInScreen';

// Mock Supabase
const mockSignInWithPassword = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockResetPasswordForEmail = jest.fn();
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
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
  key: 'SignIn',
  name: 'SignIn' as const,
  params: undefined,
};

jest.spyOn(Alert, 'alert');

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it('renders all form fields and buttons', () => {
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Sign in with Google')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('shows validation errors when submitting empty form', () => {
    const { getByText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Sign In'));

    expect(getByText('Email is required')).toBeTruthy();
    expect(getByText('Password is required')).toBeTruthy();
  });

  it('shows error for invalid email', () => {
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'notanemail');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    expect(getByText('Please enter a valid email')).toBeTruthy();
  });

  it('calls supabase signInWithPassword with correct params on valid submit', async () => {
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows alert on supabase sign in error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Sign In Failed', 'Invalid login credentials');
    });
  });

  it('calls supabase signInWithOAuth for Google sign in', async () => {
    const { getByText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Sign in with Google'));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({ provider: 'google' });
    });
  });

  it('navigates to Sign Up screen when link is pressed', () => {
    const { getByText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Sign Up'));

    expect(mockNavigate).toHaveBeenCalledWith('SignUp');
  });

  it('renders the Forgot Password link', () => {
    const { getByText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Forgot Password?')).toBeTruthy();
  });

  it('shows validation alert when tapping Forgot Password with empty email', () => {
    const { getByText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Forgot Password?'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Email Required',
      'Please enter a valid email address first.'
    );
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('shows validation alert when tapping Forgot Password with invalid email', () => {
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'notanemail');
    fireEvent.press(getByText('Forgot Password?'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Email Required',
      'Please enter a valid email address first.'
    );
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('calls resetPasswordForEmail with trimmed email on tap', async () => {
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(
      getByPlaceholderText('you@example.com'),
      '  test@example.com  '
    );
    fireEvent.press(getByText('Forgot Password?'));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: 'https://baby-baton-production.up.railway.app',
      });
    });
  });

  it('shows success alert after a reset email is sent', async () => {
    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.press(getByText('Forgot Password?'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Check Your Email',
        'If an account exists for that email, a password reset link has been sent.'
      );
    });
  });

  it('shows error alert when resetPasswordForEmail fails', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: 'Rate limit exceeded' },
    });

    const { getByText, getByPlaceholderText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.press(getByText('Forgot Password?'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Rate limit exceeded');
    });
  });

  it('clears field errors when user types', () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <SignInScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Trigger validation
    fireEvent.press(getByText('Sign In'));
    expect(getByText('Email is required')).toBeTruthy();

    // Type in email field
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 't');
    expect(queryByText('Email is required')).toBeNull();
  });
});
