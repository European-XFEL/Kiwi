import React from 'react';
import { Timestamp } from '@/karabo/data/api';
import type { PropertyProxy } from '@/lib/binding/api';
import { getBindingValue } from '../utils/getBindingValue';
import { useIdleScheduler } from '../useIdleScheduler';
import type { VectorSeries } from './useVectorSeries';

function numericValue(proxy: PropertyProxy | undefined) {
  const raw = getBindingValue(proxy);
  if (!['number', 'bigint', 'boolean'].includes(typeof raw)) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** Collect each rendered proxy update; publish paired numeric buffers at idle. */
export function useScatterData({
  proxies,
  keys,
  maxlen,
}: {
  proxies: readonly (PropertyProxy | undefined)[];
  keys: readonly string[];
  maxlen: number;
}) {
  const previousY = React.useRef<PropertyProxy | undefined>(undefined);
  const lastTimestamp = React.useRef<bigint | undefined>(undefined);
  const clearedX = React.useRef<
    | {
        proxy: PropertyProxy | undefined;
        value: unknown;
        timestamp: unknown;
      }
    | undefined
  >(undefined);
  const xValues = React.useRef<number[]>([]).current;
  const yValues = React.useRef<number[]>([]).current;
  const key = keys[1] ?? '';
  const latestKey = React.useRef(key);
  latestKey.current = key;
  const [ySeries, setYSeries] = React.useState<VectorSeries[]>(() => [
    { key, values: yValues },
  ]);
  const dirty = React.useRef(false);
  const schedulePublish = useIdleScheduler(1000);
  const publish = React.useCallback(() => {
    dirty.current = true;
    // Keep every collected pair in the source buffers while coalescing redraws.
    // The callback reads the current dirty flag, including clears before idle.
    schedulePublish(() => {
      if (!dirty.current) {
        return;
      }
      dirty.current = false;
      setYSeries([{ key: latestKey.current, values: yValues }]);
    });
  }, [schedulePublish, yValues]);
  const limit = Number.isFinite(maxlen) ? Math.max(1, Math.floor(maxlen)) : 100;

  const clear = React.useCallback(() => {
    const proxy = proxies[0];
    clearedX.current = {
      proxy,
      value: proxy?.binding?.value,
      timestamp: proxy?.timestamp,
    };
    xValues.length = 0;
    yValues.length = 0;
    // Explicit clears publish immediately and supersede a pending idle redraw.
    dirty.current = false;
    setYSeries([{ key: latestKey.current, values: yValues }]);
  }, [proxies, xValues, yValues]);

  React.useEffect(() => {
    if (ySeries[0].key !== key) {
      publish();
    }
    const [xProxy, yProxy] = proxies;
    if (yProxy !== previousY.current || !yProxy?.binding) {
      previousY.current = yProxy;
      lastTimestamp.current = undefined;
      if (yValues.length) {
        xValues.length = 0;
        yValues.length = 0;
        publish();
      }
    }
    if (yValues.length > limit) {
      xValues.splice(0, xValues.length - limit);
      yValues.splice(0, yValues.length - limit);
      publish();
    }

    const timestamp = yProxy?.timestamp;
    if (
      !(timestamp instanceof Timestamp) ||
      timestamp.time === lastTimestamp.current
    ) {
      return;
    }
    lastTimestamp.current = timestamp.time;
    const x = numericValue(xProxy);
    const y = numericValue(yProxy);
    if (x === undefined || y === undefined) {
      return;
    }
    // Clear waits until X changes its value or timestamp, even if only Y
    // continues to trigger renders.
    const cleared = clearedX.current;
    if (
      cleared &&
      cleared.proxy === xProxy &&
      cleared.value === xProxy?.binding?.value &&
      cleared.timestamp === xProxy?.timestamp
    ) {
      return;
    }
    clearedX.current = undefined;
    if (yValues.length === limit) {
      xValues.shift();
      yValues.shift();
    }
    xValues.push(x);
    yValues.push(y);
    publish();
  });

  return { xValues, ySeries, clear };
}
