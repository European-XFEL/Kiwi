import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { throttle } from 'lodash';
import type { UseDevicePropertyResult } from '@/components/shared/hooks/useDeviceProperty';
import { Timestamp } from '@/shared/helpers/timestamps';

interface TrendDataPoint {
  timestamp: number; // epoch ms
  value: number;
}

interface TrendConfig {
  maxDataPoints?: number;
  timeWindowMs?: number;
  throttleDelayMs?: number;
}

const DEFAULT_CONFIG: Required<TrendConfig> = {
  maxDataPoints: 1000,
  timeWindowMs: 5 * 60 * 1000,
  throttleDelayMs: 100,
};

/**
 * useDisplayTrendGraph
 */
export const useDisplayTrendGraph = (
  primary: UseDevicePropertyResult | undefined,
  config: TrendConfig = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const lastTsRef = useRef<number>(-Infinity);

  const isOffline = primary?.isOffline ?? false;

  const normalizeToTimeSeries = useCallback((): TrendDataPoint | null => {
    if (!primary) return null;

    const raw = primary.value ?? primary.schemaAttrs?.defaultValue;
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(num)) return null;

    let ms: number;
    try {
      ms = primary.timeAttrs
        ? Timestamp.fromTimeAttrs(primary.timeAttrs).toMilliseconds()
        : Date.now();
    } catch {
      ms = Date.now();
    }

    return { timestamp: ms, value: num };
  }, [primary]);

  const pruneData = useCallback(
    (data: TrendDataPoint[]): TrendDataPoint[] => {
      let pruned = data;

      if (Number.isFinite(finalConfig.timeWindowMs)) {
        const cutoff = Date.now() - finalConfig.timeWindowMs;
        pruned = pruned.filter((d) => d.timestamp >= cutoff);
      }

      if (pruned.length > finalConfig.maxDataPoints) {
        pruned = pruned.slice(-finalConfig.maxDataPoints);
      }

      return pruned;
    },
    [finalConfig.maxDataPoints, finalConfig.timeWindowMs]
  );

  const updateTrendDataRef = useRef((point: TrendDataPoint) => {
    setTrendData((prev) => pruneData([...prev, point]));
  });

  useEffect(() => {
    updateTrendDataRef.current = (point: TrendDataPoint) => {
      setTrendData((prev) => pruneData([...prev, point]));
    };
  }, [pruneData]);

  const throttledUpdate = useMemo(
    () =>
      throttle(
        (point: TrendDataPoint) => updateTrendDataRef.current(point),
        finalConfig.throttleDelayMs,
        { leading: true, trailing: true }
      ),
    [finalConfig.throttleDelayMs]
  );

  // When we go offline, clear and stop trailing flush
  useEffect(() => {
    if (!isOffline) return;

    throttledUpdate.cancel();
    setTrendData([]);
    lastTsRef.current = -Infinity;
  }, [isOffline, throttledUpdate]);

  // Append points on primary.value changes
  useEffect(() => {
    if (!primary || isOffline) return;

    const point = normalizeToTimeSeries();
    if (!point) return;

    if (point.timestamp <= lastTsRef.current) return;
    lastTsRef.current = point.timestamp;

    throttledUpdate(point);
  }, [
    primary?.value,
    primary?.timeAttrs,
    isOffline,
    normalizeToTimeSeries,
    throttledUpdate,
  ]);

  useEffect(() => () => throttledUpdate.cancel(), [throttledUpdate]);

  // Reset when the binding changes implicitly (new primary identity)
  useEffect(() => {
    setTrendData([]);
    lastTsRef.current = -Infinity;
  }, [primary?.deviceId, primary?.propertyPath]);

  // Periodic pruning
  useEffect(() => {
    const id = setInterval(() => {
      setTrendData((prev) => pruneData(prev));
    }, 5000);

    return () => clearInterval(id);
  }, [pruneData]);

  return {
    timestamps: trendData.map((d) => d.timestamp),
    values: trendData.map((d) => d.value),
    dataPoints: trendData.length,
    graphType: 'line' as const,
    isOffline,
  };
};
