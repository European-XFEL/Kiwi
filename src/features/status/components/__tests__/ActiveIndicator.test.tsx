import { act, render, screen } from '@testing-library/react';
import { ActiveIndicator } from '../ActiveIndicator';

describe('ActiveIndicator', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('blinks in the colour of the activity level it is given', () => {
    jest.useFakeTimers();
    const { rerender } = render(
      <ActiveIndicator lastActivity={null} activityLevel="slow" />
    );
    expect(screen.getByTitle('Connected — no recent activity')).toBeTruthy();

    rerender(<ActiveIndicator lastActivity={1} activityLevel="slow" />);
    const blinking = screen.getByTitle('Receiving data from GUI server');
    expect(blinking.firstElementChild?.className).toContain('bg-red-500');

    act(() => {
      jest.advanceTimersByTime(280);
    });
    expect(screen.getByTitle('Connected — no recent activity')).toBeTruthy();
  });
});
