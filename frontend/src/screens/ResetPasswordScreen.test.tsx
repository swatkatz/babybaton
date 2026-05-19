import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ResetPasswordScreen } from './ResetPasswordScreen';

// Mock Supabase
const mockUpdateUser = jest.fn();
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  },
}));

// Mock useAuth
const mockClearPasswordReset = jest.fn();
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ clearPasswordReset: mockClearPasswordReset }),
}));

jest.spyOn(Alert, 'alert');

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUser.mockResolvedValue({ error: null });
  });

  it('renders password and confirm password fields', () => {
    const { getByTestId, getByPlaceholderText } = render(<ResetPasswordScreen />);

    expect(getByTestId('reset-password-header')).toBeTruthy();
    expect(getByPlaceholderText('Enter new password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm new password')).toBeTruthy();
  });

  it('shows error when password is empty', () => {
    const { getByTestId, getByText } = render(<ResetPasswordScreen />);

    fireEvent.press(getByTestId('reset-password-button'));

    expect(getByText('Password is required')).toBeTruthy();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows error when password is too short', () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(
      <ResetPasswordScreen />
    );

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'abc');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'abc');
    fireEvent.press(getByTestId('reset-password-button'));

    expect(getByText('Password must be at least 6 characters')).toBeTruthy();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(
      <ResetPasswordScreen />
    );

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'password456');
    fireEvent.press(getByTestId('reset-password-button'));

    expect(getByText('Passwords do not match')).toBeTruthy();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('calls updateUser with the new password on valid submit', async () => {
    const { getByTestId, getByPlaceholderText } = render(<ResetPasswordScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'password123');
    fireEvent.press(getByTestId('reset-password-button'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'password123' });
    });
  });

  it('shows error alert when updateUser fails', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Token expired' } });

    const { getByTestId, getByPlaceholderText } = render(<ResetPasswordScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'password123');
    fireEvent.press(getByTestId('reset-password-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Token expired');
    });
    expect(mockClearPasswordReset).not.toHaveBeenCalled();
  });

  it('calls clearPasswordReset when success alert OK is pressed', async () => {
    const { getByTestId, getByPlaceholderText } = render(<ResetPasswordScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'password123');
    fireEvent.press(getByTestId('reset-password-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Password Updated',
        'Your password has been reset successfully.',
        [{ text: 'OK', onPress: expect.any(Function) }]
      );
    });

    // Invoke the OK button's onPress handler
    const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
      (call) => call[0] === 'Password Updated'
    );
    const okButton = alertCall![2][0];
    okButton.onPress();

    expect(mockClearPasswordReset).toHaveBeenCalled();
  });

  it('clears field errors when user types', () => {
    const { getByTestId, getByText, getByPlaceholderText, queryByText } = render(
      <ResetPasswordScreen />
    );

    fireEvent.press(getByTestId('reset-password-button'));
    expect(getByText('Password is required')).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'p');
    expect(queryByText('Password is required')).toBeNull();
  });
});
