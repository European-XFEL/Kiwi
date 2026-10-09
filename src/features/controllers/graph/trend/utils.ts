import { Timestamp } from '@/karabo/data/api';

export function formatTrendTime(value: number) {
  // Keep the epoch unchanged; format the instant in the browser's local timezone.
  return new Timestamp(value / 1000).toLocal(' ', 'seconds');
}
