import type { PropertyProxy } from '@/lib/binding/api';
import { useVectorData } from './useVectorData';

/** Publishes complete bar values independently of the current viewport. */
export function useVectorBarData(proxy: PropertyProxy | undefined) {
  // useVectorData owns idle publication; bars reuse it without a second delay.
  return useVectorData(proxy);
}
