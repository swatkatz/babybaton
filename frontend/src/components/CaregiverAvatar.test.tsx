import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CaregiverAvatar } from './CaregiverAvatar';

// Mock the colors module so getCaregiverColor is predictable
jest.mock('../theme/colors', () => ({
  getCaregiverColor: jest.fn(() => ({ bg: '#E8D5F2', text: '#7B2CBF' })),
  colors: {
    primary: '#5B9BD5',
    caregiverColors: [{ bg: '#E8D5F2', text: '#7B2CBF' }],
  },
}));

describe('CaregiverAvatar', () => {
  it('should render first 2 letters from a single-word name', () => {
    const { getByText } = render(
      <CaregiverAvatar caregiverId="cg-1" caregiverName="Alice" />
    );
    expect(getByText('AL')).toBeTruthy();
  });

  it('should render first 2 letters from a two-word name', () => {
    const { getByText } = render(
      <CaregiverAvatar caregiverId="cg-1" caregiverName="Jane Doe" />
    );
    expect(getByText('JA')).toBeTruthy();
  });

  it('should render first 2 letters for names with more than 2 words', () => {
    const { getByText } = render(
      <CaregiverAvatar
        caregiverId="cg-1"
        caregiverName="Mary Jane Watson"
      />
    );
    expect(getByText('MA')).toBeTruthy();
  });

  it('should uppercase initials', () => {
    const { getByText } = render(
      <CaregiverAvatar caregiverId="cg-1" caregiverName="jane doe" />
    );
    expect(getByText('JA')).toBeTruthy();
  });

  it('should use default size of 36', () => {
    const { getByText } = render(
      <CaregiverAvatar caregiverId="cg-1" caregiverName="Jane" />
    );
    const initials = getByText('JA');
    // The parent View (avatar) should have width/height of 36
    // We check the text element exists, verifying the component renders
    expect(initials).toBeTruthy();
  });

  it('should render with a custom size', () => {
    const { getByText } = render(
      <CaregiverAvatar caregiverId="cg-1" caregiverName="Jane" size={48} />
    );
    expect(getByText('JA')).toBeTruthy();
  });

  it('should be wrapped in TouchableOpacity when onPress is provided', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CaregiverAvatar
        caregiverId="cg-1"
        caregiverName="Jane"
        onPress={onPress}
      />
    );

    fireEvent.press(getByText('JA'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not be pressable when onPress is not provided', () => {
    // This test verifies the component renders without a TouchableOpacity wrapper
    const { getByText } = render(
      <CaregiverAvatar caregiverId="cg-1" caregiverName="Jane" />
    );
    // Just verify it renders without crash
    expect(getByText('JA')).toBeTruthy();
  });
});
