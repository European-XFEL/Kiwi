import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { throttle } from "lodash";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { Timestamp } from "@/shared/helpers/timestamps";

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
 * React hook for visualizing a Karabo property as a time series.
 *
 * It leverages the `Timestamp` class to obtain precise timestamps
 * from Karabo's attosecond-resolution property attributes (`sec` + `frac`).
 *
 * Internally, all time values are handled in attoseconds for accuracy,
 * but converted to milliseconds for efficient JavaScript processing and plotting.
 */
export const useDisplayTrendGraph = (
  karaboKeys: string,
  config: TrendConfig = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { property } = useKaraboPropertyInfo(karaboKeys);

  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);

  /** Convert PropertyInfo -> { timestamp(ms), value(number) } */
  const normalizeToTimeSeries = useCallback(
    (p: PropertyInfo | null): TrendDataPoint | null => {
      if (!p) return null;

      const num = typeof p.value === "number" ? p.value : Number(p.value);
      if (!Number.isFinite(num)) return null;

      const ms = Timestamp.fromPropertyAttrs(p.timeAttrs).toMilliseconds();

      return { timestamp: ms, value: num };
    },
    []
  );

  /** Limit memory usage by pruning old or excess points */
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

  /** Keep stable ref for throttled updates */
  const updateTrendDataRef = useRef((point: TrendDataPoint) => {
    setTrendData((prev) => pruneData([...prev, point]));
  });

  useEffect(() => {
    updateTrendDataRef.current = (point: TrendDataPoint) => {
      setTrendData((prev) => pruneData([...prev, point]));
    };
  }, [pruneData]);

  /** Throttled update to reduce re-renders */
  const throttledUpdate = useMemo(
    () =>
      throttle(
        (point: TrendDataPoint) => updateTrendDataRef.current(point),
        finalConfig.throttleDelayMs,
        { leading: true, trailing: true }
      ),
    [finalConfig.throttleDelayMs]
  );

  /** React to incoming property updates */
  useEffect(() => {
    const point = normalizeToTimeSeries(property);
    if (point) throttledUpdate(point);
  }, [property, normalizeToTimeSeries, throttledUpdate]);

  /** Cleanup throttle on unmount */
  useEffect(() => () => throttledUpdate.cancel(), [throttledUpdate]);

  /** Reset when data source changes */
  useEffect(() => {
    setTrendData([]);
  }, [karaboKeys]);

  /** Periodic pruning for long sessions */
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
    graphType: "line" as const,
  };
};
