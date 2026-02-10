import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { throttle } from 'lodash';
import type { UseDevicePropertyResult } from '@/lib/binding';

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

const safeNowMs = (primary?: UseDevicePropertyResult): number => {
  try {
    // TODO: Check time
    return primary?.timestamp ? primary.timestamp.toMilliseconds() : Date.now();
  } catch {
    return Date.now();
  }
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
  primary: UseDevicePropertyResult | undefined,
  config: TrendConfig = {}
) => {
  const { maxDataPoints, timeWindowMs, throttleDelayMs } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const isOffline = primary?.isOffline ?? false;

  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const lastTsRef = useRef<number>(-Infinity);

  const appendPoint = useCallback(
    (point: TrendDataPoint) => {
      setTrendData((prev) =>
        prune([...prev, point], maxDataPoints, timeWindowMs)
      );
    },
    [maxDataPoints, timeWindowMs]
  );

  const throttledAppend = useMemo(
    () =>
      throttle(appendPoint, throttleDelayMs, {
        leading: true,
        trailing: true,
      }),
    [appendPoint, throttleDelayMs]
  );

  // reset on binding identity change
  useEffect(() => {
    setTrendData([]);
    lastTsRef.current = -Infinity;
    throttledAppend.cancel();
  }, [primary?.deviceId, primary?.propertyPath, throttledAppend]);

  // clear on offline
  useEffect(() => {
    if (!isOffline) return;

    throttledAppend.cancel();
    setTrendData([]);
    lastTsRef.current = -Infinity;
  }, [isOffline, throttledAppend]);

  // append points on updates
  useEffect(() => {
    if (!primary || isOffline) return;

    const raw = primary.value;
    const value = toFiniteNumber(raw);
    if (value == null) return;

    const timestamp = safeNowMs(primary);
    if (timestamp <= lastTsRef.current) return;
    lastTsRef.current = timestamp;

    throttledAppend({ timestamp, value });
  }, [primary?.value, primary?.timestamp, primary, isOffline, throttledAppend]);

  // periodic pruning
  useEffect(() => {
    const id = setInterval(() => {
      setTrendData((prev) => prune(prev, maxDataPoints, timeWindowMs));
    }, 5000);

    return () => clearInterval(id);
  }, [maxDataPoints, timeWindowMs]);

  // cleanup
  useEffect(() => () => throttledAppend.cancel(), [throttledAppend]);

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
