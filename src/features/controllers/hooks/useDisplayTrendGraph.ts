import { useEffect, useMemo, useRef, useState } from 'react';
import { throttle } from 'lodash';
import type { UsePropertyProxyUpdate } from '@/lib/binding/api';

interface TrendDataPoint {
  timestamp: number; // epoch ms
  value: number;
}

export interface TrendConfig {
  maxDataPoints?: number;
  timeWindowMs?: number;
  throttleDelayMs?: number;
}

const DEFAULT_CONFIG: Required<TrendConfig> = {
  maxDataPoints: 1000,
  timeWindowMs: 5 * 60 * 1000,
  throttleDelayMs: 100,
};

const toFiniteNumber = (raw: unknown): number | null => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const safeNowMs = (primary?: UsePropertyProxyUpdate): number => {
  try {
    const seconds = primary?.timestamp?.toTimestamp();
    // toTimestamp() returns seconds — convert to epoch milliseconds.
    if (seconds != null && Number.isFinite(seconds)) return seconds * 1000;
  } catch {
    // fall through
  }
  return Date.now();
};

const prune = (data: TrendDataPoint[], max: number, windowMs: number) => {
  let out = data;

  if (Number.isFinite(windowMs)) {
    const cutoff = Date.now() - windowMs;
    out = out.filter((d) => d.timestamp >= cutoff);
  }

  if (out.length > max) out = out.slice(-max);
  return out;
};

/**
 * useDisplayTrendGraph
 */
export const useDisplayTrendGraph = (
  primary: UsePropertyProxyUpdate | undefined,
  config: TrendConfig = {}
) => {
  const { maxDataPoints, timeWindowMs, throttleDelayMs } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const isOffline = primary?.isOffline ?? false;

  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const lastTsRef = useRef<number>(-Infinity);

  // Ref keeps the append function fresh without changing throttledUpdate's identity.
  const appendPointRef = useRef((point: TrendDataPoint) => {
    setTrendData((prev) =>
      prune([...prev, point], maxDataPoints, timeWindowMs)
    );
  });

  useEffect(() => {
    appendPointRef.current = (point: TrendDataPoint) => {
      setTrendData((prev) =>
        prune([...prev, point], maxDataPoints, timeWindowMs)
      );
    };
  }, [maxDataPoints, timeWindowMs]);

  // throttledUpdate only re-creates when throttleDelayMs changes — not on prune config changes.
  const throttledUpdate = useMemo(
    () =>
      throttle(
        (point: TrendDataPoint) => appendPointRef.current(point),
        throttleDelayMs,
        { leading: true, trailing: true }
      ),
    [throttleDelayMs]
  );

  // reset on binding identity change
  useEffect(() => {
    throttledUpdate.cancel();
    setTrendData([]);
    lastTsRef.current = -Infinity;
  }, [primary?.deviceId, primary?.propertyPath, throttledUpdate]);

  // clear on offline
  useEffect(() => {
    if (!isOffline) return;

    throttledUpdate.cancel();
    setTrendData([]);
    lastTsRef.current = -Infinity;
  }, [isOffline, throttledUpdate]);

  // append points on updates
  useEffect(() => {
    if (!primary || isOffline) return;

    const value = toFiniteNumber(primary.value);
    if (value == null) return;

    const timestamp = safeNowMs(primary);
    if (timestamp <= lastTsRef.current) return;
    lastTsRef.current = timestamp;

    throttledUpdate({ timestamp, value });
  }, [primary?.value, primary?.timestamp, primary, isOffline, throttledUpdate]);

  // periodic pruning
  useEffect(() => {
    const id = setInterval(() => {
      setTrendData((prev) => prune(prev, maxDataPoints, timeWindowMs));
    }, 5000);

    return () => clearInterval(id);
  }, [maxDataPoints, timeWindowMs]);

  // cleanup
  useEffect(() => () => throttledUpdate.cancel(), [throttledUpdate]);

  const timestamps = useMemo(
    () => trendData.map((d) => d.timestamp),
    [trendData]
  );
  const values = useMemo(() => trendData.map((d) => d.value), [trendData]);

  return {
    timestamps,
    values,
    dataPoints: trendData.length,
    graphType: 'line' as const,
    isOffline,
  };
};
