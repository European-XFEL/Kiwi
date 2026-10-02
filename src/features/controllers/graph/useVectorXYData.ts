import React from 'react';
import type { PropertyProxy } from '@/lib/binding/api';
import { useIdleScheduler } from '../useIdleScheduler';
import { normalizeVector, type VectorData } from './normalizeVector';

export type VectorXYSeries = { key: string; values: VectorData };

/** Publish the latest vectors together, retaining every scene property slot. */
export function useVectorXYData(
  proxies: readonly (PropertyProxy | undefined)[],
  keys: readonly string[]
) {
  const keysId = JSON.stringify(keys);
  const latest = React.useRef({ keysId, keys, raw: [] as unknown[] });
  const raw = keys.map((_, i) => proxies[i]?.value);
  if (
    latest.current.keysId !== keysId ||
    latest.current.raw.length !== raw.length ||
    raw.some((value, i) => !Object.is(value, latest.current.raw[i]))
  )
    latest.current = { keysId, keys, raw };
  const snapshot = latest.current;
  const previousKeys = React.useRef(keysId);
  const empty = React.useMemo(() => {
    const orderedKeys: string[] = JSON.parse(keysId);
    return {
      keysId,
      x: new Float64Array() as VectorData,
      series: orderedKeys.slice(1).map((key) => ({
        key,
        values: new Float64Array() as VectorData,
      })),
    };
  }, [keysId]);
  const [published, setPublished] = React.useState(empty);
  const schedulePublish = useIdleScheduler(1000);

  React.useEffect(() => {
    if (previousKeys.current !== snapshot.keysId) setPublished(empty);
    previousKeys.current = snapshot.keysId;
    schedulePublish(() => {
      const { keysId, keys, raw } = latest.current;
      setPublished({
        keysId,
        x: normalizeVector(raw[0]),
        series: keys.slice(1).map((key, i) => ({
          key,
          values: normalizeVector(raw[i + 1]),
        })),
      });
    });
  }, [snapshot, empty, schedulePublish]);

  return published.keysId === keysId ? published : empty;
}
