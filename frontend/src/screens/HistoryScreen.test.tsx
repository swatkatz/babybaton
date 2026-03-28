import React from 'react';
import { render } from '@testing-library/react-native';
import { HistoryScreen } from './HistoryScreen';

describe('HistoryScreen', () => {
  it('renders placeholder text', () => {
    const { getByText } = render(<HistoryScreen />);
    expect(getByText('History coming soon')).toBeTruthy();
  });
});
