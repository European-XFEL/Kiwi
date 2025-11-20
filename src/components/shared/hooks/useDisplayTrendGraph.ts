import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { throttle } from "lodash";
import { useKaraboPropertyInfo } from "./useKaraboProperty";
import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { Timestamp } from "@/shared/helpers/timestamps";
import { splitKaraboKeys } from "../helpers/splitKaraboKeys";
import { TopologyConnector } from "@/karabo_connectors/TopologyConnector";
import { DeviceInfo, TopologyEventType } from "@/karabo_data/TopologyInfo";

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
 *Also uses the topology connector to check the status of the device
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

  // figure out the device we should watch in topology
  const { deviceId } = useMemo(() => splitKaraboKeys(karaboKeys), [karaboKeys]);

  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(
    !TopologyConnector.inst.isDeviceOnline(deviceId)
  );

  // keep last appended timestamp to avoid duplicates/out-of-order spam
  const lastTsRef = useRef<number>(-Infinity);

  /** Convert PropertyInfo -> { timestamp(ms), value(number) } */
  const normalizeToTimeSeries = useCallback(
    (p: PropertyInfo | null): TrendDataPoint | null => {
      if (!p) return null;

      const num = typeof p.value === "number" ? p.value : Number(p.value);
      if (!Number.isFinite(num)) return null;

      let ms: number;
      try {
        // guard: some properties may not have timeAttrs populated yet
        ms = p.timeAttrs
          ? Timestamp.fromTimeAttrs(p.timeAttrs).toMilliseconds()
          : Date.now();
      } catch {
        ms = Date.now();
      }
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

  /** Stable ref for the appender to cooperate with throttle */
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

  /** React to incoming property updates (only when online) */
  useEffect(() => {
    if (isOffline) return;
    const point = normalizeToTimeSeries(property as PropertyInfo | null);
    if (!point) return;

    // discard duplicates or time going backwards
    if (point.timestamp <= lastTsRef.current) return;
    lastTsRef.current = point.timestamp;

    throttledUpdate(point);
  }, [property, isOffline, normalizeToTimeSeries, throttledUpdate]);

  /** Cleanup throttle on unmount */
  useEffect(() => () => throttledUpdate.cancel(), [throttledUpdate]);

  /** Reset when data source changes */
  useEffect(() => {
    setTrendData([]);
    lastTsRef.current = -Infinity;
  }, [karaboKeys]);

  /** Subscribe to topology for online/offline transitions */
  const onDeviceInfoUpdate = useCallback(
    (eventType: TopologyEventType, info: DeviceInfo) => {
      if (info.deviceId !== deviceId) {
        console.error(
          `Topology routing error: expected ${deviceId}, got ${info.deviceId}`
        );
        return;
      }
      const offline = eventType === TopologyEventType.GONE;
      setIsOffline(offline);

      // If device just went offline, clear the graph so UI reflects state quickly
      if (offline) {
        setTrendData([]);
        lastTsRef.current = -Infinity;
      }
    },
    [deviceId]
  );

  useEffect(() => {
    TopologyConnector.inst.registerDeviceInfoMonitor(
      deviceId,
      onDeviceInfoUpdate
    );
    return () => {
      TopologyConnector.inst.unregisterDeviceInfoMonitor(
        deviceId,
        onDeviceInfoUpdate
      );
    };
  }, [deviceId, onDeviceInfoUpdate]);

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
    isOffline,
  };
};
