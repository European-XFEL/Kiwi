import React from 'react';
import { Timestamp } from '@/karabo/data/api';
import type { PropertyProxy } from '@/lib/binding/api';
import { getBindingValue } from '../utils/getBindingValue';
import { useIdleScheduler } from '../useIdleScheduler';

export type ScatterPoint = { x: number; y: number };

function numericValue(proxy: PropertyProxy | undefined) {
  const raw = getBindingValue(proxy);
  if (!['number', 'bigint', 'boolean'].includes(typeof raw)) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** Collect each rendered proxy update; publish chart revisions when idle. */
export function useScatterData(proxies: PropertyProxy[], maxlen: number) {
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
  const points = React.useRef<ScatterPoint[]>([]).current;
  const [dataRevision, setDataRevision] = React.useState(0);
  const dirty = React.useRef(false);
  const schedulePublish = useIdleScheduler(1000);
  const publish = React.useCallback(() => {
    dirty.current = true;
    // Keep every collected point in the shared array while coalescing redraws.
    // The callback reads the current dirty flag, including clears before idle.
    schedulePublish(() => {
      if (!dirty.current) return;
      dirty.current = false;
      setDataRevision((current) => current + 1);
    });
  }, [schedulePublish]);
  const limit = Number.isFinite(maxlen) ? Math.max(1, Math.floor(maxlen)) : 100;

  const clear = React.useCallback(() => {
    const proxy = proxies[0];
    clearedX.current = {
      proxy,
      value: proxy?.binding?.value,
      timestamp: proxy?.timestamp,
    };
    // Chart.js observes splice arguments and requires an explicit delete count.
    points.splice(0, points.length);
    // Explicit clears publish immediately and supersede a pending idle redraw.
    dirty.current = false;
    setDataRevision((current) => current + 1);
  }, [proxies, points]);

  React.useEffect(() => {
    const [xProxy, yProxy] = proxies;
    if (yProxy !== previousY.current || !yProxy?.binding) {
      previousY.current = yProxy;
      lastTimestamp.current = undefined;
      if (points.length) {
        points.splice(0, points.length);
        publish();
      }
    }
    if (points.length > limit) {
      points.splice(0, points.length - limit);
      publish();
    }

    const timestamp = yProxy?.timestamp;
    if (
      !(timestamp instanceof Timestamp) ||
      timestamp.time === lastTimestamp.current
    )
      return;
    lastTimestamp.current = timestamp.time;
    const x = numericValue(xProxy);
    const y = numericValue(yProxy);
    if (x === undefined || y === undefined) return;
    // Clear waits until X changes its value or timestamp, even if only Y
    // continues to trigger renders.
    const cleared = clearedX.current;
    if (
      cleared &&
      cleared.proxy === xProxy &&
      cleared.value === xProxy?.binding?.value &&
      cleared.timestamp === xProxy?.timestamp
    )
      return;
    clearedX.current = undefined;
    if (points.length === limit) points.shift();
    points.push({ x, y });
    publish();
  }, [proxies, limit, points, publish]);

  return { points, dataRevision, clear };
}
