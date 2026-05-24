import { useEffect, useMemo, useRef, useState } from 'react';
import { throttle } from 'lodash';
import { PropertyProxy } from '@/lib/binding/PropertyProxy';
import type { PropertyProxies } from './useController';

interface TrendDataPoint {
  timestamp: number; // epoch ms
  value: number;
}

export interface TrendSeries {
  deviceId: string | undefined;
  propertyPath: string | undefined;
  timestamps: number[];
  values: number[];
  dataPoints: number;
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

const timestampSeconds = (
  propertyProxy?: PropertyProxy | null
): number | undefined => {
  try {
    const seconds = propertyProxy?.timestamp?.toTimestamp();
    if (seconds != null && Number.isFinite(seconds)) return seconds;
  } catch {
    // fall through
  }
  return undefined;
};

const safeNowMs = (propertyProxy?: PropertyProxy | null): number => {
  const seconds = timestampSeconds(propertyProxy);
  // toTimestamp() returns seconds — convert to epoch milliseconds.
  if (seconds != null) return seconds * 1000;
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
  proxies: PropertyProxies = [],
  isOffline: boolean,
  deviceId: string | undefined,
  config: TrendConfig = {}
) => {
  const { maxDataPoints, timeWindowMs, throttleDelayMs } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const seriesCount = proxies.length;
  const bindingKey = proxies
    .map(
      (propertyProxy) =>
        `${propertyProxy?.root.deviceId ?? ''}.${propertyProxy?.path ?? ''}`
    )
    .join(',');
  const [trendData, setTrendData] = useState<TrendDataPoint[][]>([]);
  const lastTsRef = useRef<number[]>([]);
  const pendingRef = useRef<Map<number, TrendDataPoint>>(new Map());
  const proxiesRef = useRef(proxies);
  proxiesRef.current = proxies;
  const sampleKey = proxies
    .map((propertyProxy) => {
      const value = toFiniteNumber(propertyProxy?.value);
      const timestamp = timestampSeconds(propertyProxy);
      return [
        propertyProxy?.root.deviceId ?? '',
        propertyProxy?.path ?? '',
        value ?? '',
        timestamp ?? '',
      ].join(':');
    })
    .join(',');

  const flushPending = useMemo(
    () =>
      throttle(
        () => {
          const pending = pendingRef.current;
          if (pending.size === 0) return;

          pendingRef.current = new Map();
          setTrendData((prev) => {
            const next = Array.from(
              { length: seriesCount },
              (_, index) => prev[index] ?? []
            );

            pending.forEach((point, index) => {
              next[index] = prune(
                [...(next[index] ?? []), point],
                maxDataPoints,
                timeWindowMs
              );
            });

            return next;
          });
        },
        throttleDelayMs,
        { leading: true, trailing: true }
      ),
    [maxDataPoints, seriesCount, throttleDelayMs, timeWindowMs]
  );

  // reset on binding identity change
  useEffect(() => {
    flushPending.cancel();
    pendingRef.current.clear();
    setTrendData(Array.from({ length: seriesCount }, () => []));
    lastTsRef.current = Array.from({ length: seriesCount }, () => -Infinity);
  }, [deviceId, flushPending, seriesCount, bindingKey]);

  // clear on offline
  useEffect(() => {
    if (!isOffline) return;

    flushPending.cancel();
    pendingRef.current.clear();
    setTrendData(Array.from({ length: seriesCount }, () => []));
    lastTsRef.current = Array.from({ length: seriesCount }, () => -Infinity);
  }, [flushPending, isOffline, seriesCount]);

  // append points on updates
  useEffect(() => {
    if (isOffline) return;

    proxiesRef.current.forEach((propertyProxy, index) => {
      const value = toFiniteNumber(propertyProxy?.value);
      if (value == null) return;

      const timestamp = safeNowMs(propertyProxy);
      if (timestamp <= (lastTsRef.current[index] ?? -Infinity)) return;

      lastTsRef.current[index] = timestamp;
      pendingRef.current.set(index, { timestamp, value });
    });

    flushPending();
  }, [flushPending, isOffline, sampleKey]);

  // periodic pruning
  useEffect(() => {
    const id = setInterval(() => {
      setTrendData((prev) =>
        prev.map((series) => prune(series, maxDataPoints, timeWindowMs))
      );
    }, 5000);

    return () => clearInterval(id);
  }, [maxDataPoints, timeWindowMs]);

  // cleanup
  useEffect(() => () => flushPending.cancel(), [flushPending]);

  const series = useMemo<TrendSeries[]>(
    () =>
      proxies.map((propertyProxy, index) => {
        const data = trendData[index] ?? [];

        return {
          deviceId: propertyProxy?.root.deviceId,
          propertyPath: propertyProxy?.path,
          timestamps: data.map((d) => d.timestamp),
          values: data.map((d) => d.value),
          dataPoints: data.length,
        };
      }),
    [proxies, trendData]
  );

  return {
    series,
    dataPoints: series.reduce((sum, item) => sum + item.dataPoints, 0),
    isOffline,
  };
};
