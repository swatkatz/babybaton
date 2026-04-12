import React from 'react';
import { render } from '@testing-library/react-native';
import { GoalAdherenceBar } from './GoalAdherenceBar';

jest.mock('../theme/colors', () => ({
  colors: {
    success: '#7BC96F',
    warning: '#FFD93D',
    error: '#FF6B6B',
    border: '#E1E8ED',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C9A',
  },
}));

describe('GoalAdherenceBar', () => {
  it('returns null when percentage is null', () => {
    const { toJSON } = render(
      <GoalAdherenceBar label="Feed Interval" percentage={null} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders label and percentage text', () => {
    const { getByText } = render(
      <GoalAdherenceBar label="Feed Interval" percentage={85} />
    );
    expect(getByText('Feed Interval')).toBeTruthy();
    expect(getByText('85%')).toBeTruthy();
  });

  it('uses green color for percentage >= 80', () => {
    const { getByTestId } = render(
      <GoalAdherenceBar label="Test" percentage={85} />
    );
    const fill = getByTestId('goal-adherence-fill');
    expect(fill.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#7BC96F' }),
      ])
    );
  });

  it('uses yellow color for percentage 50-79', () => {
    const { getByTestId } = render(
      <GoalAdherenceBar label="Test" percentage={65} />
    );
    const fill = getByTestId('goal-adherence-fill');
    expect(fill.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#FFD93D' }),
      ])
    );
  });

  it('uses red color for percentage < 50', () => {
    const { getByTestId } = render(
      <GoalAdherenceBar label="Test" percentage={30} />
    );
    const fill = getByTestId('goal-adherence-fill');
    expect(fill.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#FF6B6B' }),
      ])
    );
  });

  it('renders correct width based on percentage', () => {
    const { getByTestId } = render(
      <GoalAdherenceBar label="Test" percentage={75} />
    );
    const fill = getByTestId('goal-adherence-fill');
    expect(fill.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: '75%' }),
      ])
    );
  });

  it('clamps percentage to 0-100 range', () => {
    const { getByTestId, getByText } = render(
      <GoalAdherenceBar label="Test" percentage={150} />
    );
    const fill = getByTestId('goal-adherence-fill');
    expect(fill.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: '100%' }),
      ])
    );
    expect(getByText('100%')).toBeTruthy();
  });
});
