import React from 'react';
import type { PropertyProxy } from '@/lib/binding/api';
import { getArrayData } from '../utils/arrays';
import { useIdleScheduler } from '../useIdleScheduler';
import { normalizeVector, type VectorData } from './utils';

export type VectorSeries = { key: string; values: VectorData };
const emptyVector = new Float64Array();

/**
 * Publish every configured vector together, decoding only at idle.
 * Any configured proxy update schedules a frame using all latest values.
 */
export function useVectorSeries({
  proxies,
  keys,
}: {
  proxies: readonly (PropertyProxy | undefined)[];
  keys: readonly string[];
}) {
  const keysId = JSON.stringify(keys);
  const latest = React.useRef({ proxies, keys });
  latest.current = { proxies, keys };
  // Proxies and keys share the same slot order, including missing proxies.
  const inputs = keys.flatMap((_, slot) => {
    const proxy = proxies[slot];
    const binding = proxy?.binding;
    return [proxy, binding, binding?.timestamp];
  });
  const previous = React.useRef({ keysId, inputs });
  if (
    previous.current.keysId !== keysId ||
    inputs.some(
      (input, index) => !Object.is(input, previous.current.inputs[index])
    )
  ) {
    previous.current = { keysId, inputs };
  }
  const snapshot = previous.current;
  const empty = React.useMemo(() => {
    const orderedKeys: string[] = JSON.parse(keysId);
    return {
      keysId,
      series: orderedKeys.map((key) => ({ key, values: emptyVector })),
    };
  }, [keysId]);
  const [published, setPublished] = React.useState<{
    keysId: string;
    series: VectorSeries[];
  }>(empty);
  const schedulePublish = useIdleScheduler(1000);
  React.useEffect(() => {
    schedulePublish(() => {
      const { keys, proxies } = latest.current;
      setPublished({
        keysId: JSON.stringify(keys),
        series: keys.map((key, index) => {
          const [value] = getArrayData(proxies[index], emptyVector);
          return { key, values: normalizeVector(value) };
        }),
      });
    });
  }, [snapshot, schedulePublish]);
  return published.keysId === keysId ? published.series : empty.series;
}
