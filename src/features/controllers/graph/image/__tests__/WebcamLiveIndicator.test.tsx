import { act, cleanup, render, screen } from '@testing-library/react';
import { Timestamp } from '@/karabo/data/api';
import { WebcamLiveIndicator } from '../WebcamLiveIndicator';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-03T12:00:00Z'));
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

test('reuses formatted timestamps until a new frame timestamp arrives', () => {
  const timestamp = new Timestamp(new Date());
  const format = jest.spyOn(timestamp, 'toLocal');
  const { rerender } = render(<WebcamLiveIndicator timestamp={timestamp} />);
  expect(format).toHaveBeenCalledTimes(1);
  rerender(<WebcamLiveIndicator timestamp={timestamp} />);
  act(() => jest.advanceTimersByTime(5000));
  expect(format).toHaveBeenCalledTimes(1);
  const nextTimestamp = new Timestamp(new Date());
  rerender(<WebcamLiveIndicator timestamp={nextTimestamp} />);
  expect(screen.getByLabelText('Image timestamp')).toHaveTextContent(
    nextTimestamp.toLocal(' ', 'seconds')
  );
  expect(screen.getByLabelText('Live image')).toBeVisible();
});

test('expires the Live dot after five seconds while retaining the timestamp', () => {
  const timestamp = new Timestamp(new Date());
  const { rerender, unmount } = render(
    <WebcamLiveIndicator timestamp={timestamp} />
  );
  expect(screen.getByLabelText('Live image')).toBeVisible();
  expect(screen.getByLabelText('Image timestamp')).toHaveTextContent(
    timestamp.toLocal(' ', 'seconds')
  );
  act(() => jest.advanceTimersByTime(4999));
  expect(screen.getByLabelText('Live image')).toBeVisible();
  act(() => jest.advanceTimersByTime(1));
  expect(screen.queryByLabelText('Live image')).toBeNull();
  expect(screen.getByLabelText('Waiting for image')).toHaveTextContent(
    'Waiting ...'
  );
  expect(
    screen.getByLabelText('Waiting for image').firstElementChild
  ).toHaveStyle({ background: 'gray' });
  expect(screen.getByLabelText('Image timestamp')).toBeVisible();
  rerender(<WebcamLiveIndicator timestamp={new Timestamp(new Date())} />);
  expect(screen.getByLabelText('Live image')).toBeVisible();
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('does not mark old or missing frames Live and resets expiry for new frames', () => {
  const { rerender } = render(<WebcamLiveIndicator />);
  expect(screen.getByLabelText('Waiting for image')).toBeVisible();
  expect(screen.queryByLabelText('Image timestamp')).toBeNull();
  rerender(
    <WebcamLiveIndicator
      timestamp={new Timestamp(new Date(Date.now() - 6000))}
    />
  );
  expect(screen.queryByLabelText('Live image')).toBeNull();
  expect(screen.getByLabelText('Waiting for image')).toBeVisible();
  rerender(<WebcamLiveIndicator timestamp={new Timestamp(new Date())} />);
  act(() => jest.advanceTimersByTime(4000));
  rerender(<WebcamLiveIndicator timestamp={new Timestamp(new Date())} />);
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByLabelText('Live image')).toBeVisible();
  expect(jest.getTimerCount()).toBe(1);
  rerender(<WebcamLiveIndicator />);
  expect(screen.getByLabelText('Waiting for image')).toBeVisible();
  expect(jest.getTimerCount()).toBe(0);
});
