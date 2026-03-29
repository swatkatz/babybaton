import React from 'react';
import { render } from '@testing-library/react-native';
import { UpcomingScreen } from './UpcomingScreen';

describe('UpcomingScreen', () => {
  it('renders placeholder text', () => {
    const { getByText } = render(<UpcomingScreen />);
    expect(getByText('Upcoming coming soon')).toBeTruthy();
  });
});
