import React from 'react';
import { PropertyProxy } from '@/lib/binding/api';
import { useIdleScheduler } from '../useIdleScheduler';
import { normalizeVector, type VectorData } from './utils';

export type { VectorData } from './utils';

/**
 * Normalizes proxy values into numeric vectors and publishes the latest value
 * when the browser is idle for useVectorChart to plot.
 */
export function useVectorData(proxy: PropertyProxy | undefined) {
  const rawValue = proxy?.value;
  const latestValue = React.useRef(rawValue);
  latestValue.current = rawValue;
  const schedulePublish = useIdleScheduler(1000);
  const [values, setPublished] = React.useState<VectorData>(
    () => new Float64Array()
  );

  React.useEffect(() => {
    if (rawValue == null) {
      setPublished((current) =>
        current.length === 0 ? current : new Float64Array()
      );
      return;
    }
    // Coalesce full-vector replacements and read the latest value at idle.
    // The scheduler's timeout keeps publication moving on busy pages.
    schedulePublish(() => {
      setPublished(normalizeVector(latestValue.current));
    });
  }, [rawValue, schedulePublish]);

  return { values };
}
