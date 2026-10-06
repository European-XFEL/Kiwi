import React from 'react';
import type { PropertyProxy } from '@/lib/binding/api';
import { getArrayData } from '../utils/arrays';
import { useIdleScheduler } from '../useIdleScheduler';
import { normalizeVector, type VectorData } from './utils';

export type { VectorData } from './utils';

const emptyVector = new Float64Array();

/**
 * Normalizes proxy values into numeric vectors and publishes the latest value
 * when the browser is idle for useVectorChart to plot.
 */
export function useVectorData(proxy: PropertyProxy | undefined) {
  const timestamp = proxy?.binding?.timestamp;
  const latestProxy = React.useRef(proxy);
  latestProxy.current = proxy;
  const schedulePublish = useIdleScheduler(1000);
  const [values, setPublished] = React.useState<VectorData>(emptyVector);

  React.useEffect(() => {
    // Coalesce full-vector replacements and read the latest value at idle.
    // The scheduler's timeout keeps publication moving on busy pages.
    schedulePublish(() => {
      const [value] = getArrayData(latestProxy.current, emptyVector);
      setPublished(normalizeVector(value));
    });
  }, [timestamp, schedulePublish]);

  return { values };
}
