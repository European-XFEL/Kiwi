import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { throttle } from "lodash";
import { useKaraboProperty } from "../../displayStateColor/hooks/useKaraboProperty";

interface TrendDataPoint {
  timestamp: number;
  value: number;
}

interface TrendConfig {
  maxDataPoints?: number;
  timeWindowMs?: number;
  throttleDelayMs?: number;
}

const DEFAULT_CONFIG = {
  maxDataPoints: 1000,
  timeWindowMs: 5 * 60 * 1000,
  throttleDelayMs: 100,
};

export const useDisplayTrendGraph = (
  karaboKeys: string,
  config: TrendConfig = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { value } = useKaraboProperty(karaboKeys, "UNKNOWN");
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);

  const normalizeToTimeSeries = useCallback(
    (val: unknown): TrendDataPoint | null => {
      if (val == null || val === "UNKNOWN") return null;
      const numericValue =
        typeof val === "number" ? val : parseFloat(String(val));
      if (!isFinite(numericValue)) return null;
      return { timestamp: Date.now(), value: numericValue };
    },
    []
  );

  const pruneData = useCallback(
    (data: TrendDataPoint[]): TrendDataPoint[] => {
      // Keep only the most recent maxDataPoints entries
      if (data.length > finalConfig.maxDataPoints) {
        return data.slice(-finalConfig.maxDataPoints);
      }
      return data;
    },
    [finalConfig.maxDataPoints]
  );

  // Use ref to avoid recreating throttle when TrendData changes
  const updateTrendDataRef = useRef((point: TrendDataPoint) => {
    setTrendData((prev) => pruneData([...prev, point]));
  });

  // Keep ref updated with latest pruneData
  useEffect(() => {
    updateTrendDataRef.current = (point: TrendDataPoint) => {
      setTrendData((prev) => pruneData([...prev, point]));
    };
  }, [pruneData]);

  // ThrottleUpdate only recreates when delay changes(memoized), NOT when TrendData changes
  const throttledUpdate = useMemo(() => {
    return throttle(
      (point: TrendDataPoint) => updateTrendDataRef.current(point), //ensures that callback stays fresh
      finalConfig.throttleDelayMs,
      { leading: true, trailing: true }
    );
  }, [finalConfig.throttleDelayMs]); // Only delay in deps!

  useEffect(() => {
    const point = normalizeToTimeSeries(value);
    if (point) throttledUpdate(point);
  }, [value, normalizeToTimeSeries, throttledUpdate]);

  useEffect(() => {
    return () => throttledUpdate.cancel();
  }, [throttledUpdate]);

  useEffect(() => {
    setTrendData([]);
  }, [karaboKeys]);

  useEffect(() => {
    const interval = setInterval(
      () => setTrendData((prev) => pruneData(prev)),
      5000
    );
    return () => clearInterval(interval);
  }, [pruneData]);

  return {
    timestamps: trendData.map((d) => d.timestamp),
    values: trendData.map((d) => d.value),
    dataPoints: trendData.length,
    graphType: "line" as const,
  };
};
