import React from 'react';
import { isTypedArray } from '@/karabo/data/api';
import { PropertyProxy } from '@/lib/binding/api';
import { useIdleScheduler } from '../useIdleScheduler';

export type VectorData = ArrayLike<number>;
function normalizeVector(raw: unknown): VectorData {
  if (!raw) return new Float64Array();

  if (isTypedArray(raw)) {
    if (!(raw instanceof BigInt64Array) && !(raw instanceof BigUint64Array))
      return raw;
  } else if (!Array.isArray(raw)) {
    return new Float64Array();
  }

  const normalized = new Float64Array(raw.length);
  for (let index = 0; index < raw.length; index++) {
    normalized[index] = Number(raw[index]);
  }
  return normalized;
}

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
    schedulePublish(() => {
      setPublished(normalizeVector(latestValue.current));
    });
  }, [rawValue, schedulePublish]);

  return { values };
}
