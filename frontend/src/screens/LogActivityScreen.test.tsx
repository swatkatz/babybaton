import React from 'react';
import { render } from '@testing-library/react-native';
import { LogActivityScreen } from './LogActivityScreen';

describe('LogActivityScreen', () => {
  it('renders placeholder text', () => {
    const { getByText } = render(<LogActivityScreen />);
    expect(getByText('Log Activity coming soon')).toBeTruthy();
  });
});
