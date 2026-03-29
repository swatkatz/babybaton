import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar } from './SearchBar';

jest.mock('lucide-react-native', () => ({
  Search: () => 'Search',
  X: () => 'X',
}));

jest.mock('../theme/colors', () => ({
  colors: {
    surface: '#FFFFFF',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
    textLight: '#A8B4C0',
  },
}));

describe('SearchBar', () => {
  it('renders TextInput with placeholder "Search activities..."', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={jest.fn()} />
    );
    expect(getByPlaceholderText('Search activities...')).toBeTruthy();
  });

  it('calls onChangeText when text entered', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText('Search activities...'), 'poop');
    expect(onChangeText).toHaveBeenCalledWith('poop');
  });

  it('shows clear (X) button only when text is non-empty', () => {
    const { queryByTestId, rerender } = render(
      <SearchBar value="" onChangeText={jest.fn()} />
    );
    expect(queryByTestId('clear-button')).toBeNull();

    rerender(<SearchBar value="poop" onChangeText={jest.fn()} />);
    expect(queryByTestId('clear-button')).toBeTruthy();
  });

  it('clearing calls onChangeText with empty string', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <SearchBar value="poop" onChangeText={onChangeText} />
    );
    fireEvent.press(getByTestId('clear-button'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
