import React from 'react';
import { render } from '@testing-library/react-native';
import { DayHeader } from './DayHeader';

jest.mock('../utils/time', () => ({
  formatMinutesToDuration: jest.fn((min: number) => {
    const hours = Math.floor(min / 60);
    const mins = min % 60;
    if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    return `${mins}m`;
  }),
}));

describe('DayHeader', () => {
  it('renders day label', () => {
    const { getByText } = render(
      <DayHeader
        label="Today"
        feedCount={3}
        totalMl={290}
        diaperPoop={2}
        diaperPee={1}
        totalSleepMinutes={90}
      />
    );
    expect(getByText('Today')).toBeTruthy();
  });

  it('renders summary stats with feeds, diapers, and sleep', () => {
    const { getByText } = render(
      <DayHeader
        label="Today"
        feedCount={3}
        totalMl={290}
        diaperPoop={2}
        diaperPee={1}
        totalSleepMinutes={90}
      />
    );
    expect(getByText(/3 feeds · 290ml/)).toBeTruthy();
    expect(getByText(/2💩 1💧/)).toBeTruthy();
    expect(getByText(/1h 30m😴/)).toBeTruthy();
  });

  it('omits sleep section when totalSleepMinutes is 0', () => {
    const { queryByText } = render(
      <DayHeader
        label="Today"
        feedCount={2}
        totalMl={200}
        diaperPoop={1}
        diaperPee={0}
        totalSleepMinutes={0}
      />
    );
    expect(queryByText(/😴/)).toBeNull();
  });

  it('omits diaper breakdown when counts are 0', () => {
    const { queryByText } = render(
      <DayHeader
        label="Today"
        feedCount={1}
        totalMl={100}
        diaperPoop={0}
        diaperPee={0}
        totalSleepMinutes={30}
      />
    );
    expect(queryByText(/💩/)).toBeNull();
    expect(queryByText(/💧/)).toBeNull();
  });
});
