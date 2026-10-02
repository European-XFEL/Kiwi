import { Timestamp } from '@/karabo/data/api';

export function formatTrendTime(value: number) {
  return new Timestamp(value / 1000).toLocal(' ', 'seconds');
}
