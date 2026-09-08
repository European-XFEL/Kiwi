import { useEffect, useMemo, useRef, useState } from 'react';
import { PropertyProxy } from '@/lib/binding/PropertyProxy';
import type { PropertyProxies } from './useController';
import { TrendModel } from '../trendmodel';

export interface TrendSeries {
  deviceId: string | undefined;
  propertyPath: string | undefined;
  timestamps: Float64Array;
  values: Float64Array;
  dataPoints: number;
}

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

/**
 * useDisplayTrendGraph
 */
export const useDisplayTrendGraph = (
  proxies: PropertyProxies = [],
  isOffline: boolean,
  deviceId: string | undefined
) => {
  const seriesCount = proxies.length;
  const bindingKey = proxies
    .map(
      (propertyProxy) =>
        `${propertyProxy?.root.deviceId ?? ''}.${propertyProxy?.path ?? ''}`
    )
    .join(',');
  // Models stay in refs so incoming samples update bounded storage without
  // copying plot arrays. A revision publishes one immutable snapshot batch.
  const [revision, setRevision] = useState(0);
  const lastTsRef = useRef<number[]>([]);
  const modelsRef = useRef<TrendModel[]>([]);
  const proxiesRef = useRef(proxies);
  proxiesRef.current = proxies;
  const seriesMetadata = useMemo(
    () =>
      proxies.map((propertyProxy) => ({
        deviceId: propertyProxy?.root.deviceId,
        propertyPath: propertyProxy?.path,
      })),
    // Live updates replace `proxies`; series metadata changes only with bindings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bindingKey]
  );
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

  // reset on binding identity change
  useEffect(() => {
    modelsRef.current = Array.from(
      { length: seriesCount },
      () => new TrendModel()
    );
    lastTsRef.current = Array.from({ length: seriesCount }, () => -Infinity);
    setRevision((current) => current + 1);
  }, [deviceId, seriesCount, bindingKey]);

  // clear on offline
  useEffect(() => {
    if (!isOffline) return;

    modelsRef.current = Array.from(
      { length: seriesCount },
      () => new TrendModel()
    );
    lastTsRef.current = Array.from({ length: seriesCount }, () => -Infinity);
    setRevision((current) => current + 1);
  }, [isOffline, seriesCount]);

  // append points on updates
  useEffect(() => {
    if (isOffline) return;

    // One network change can update several proxies. Collect every changed
    // series first, then publish once so the batch causes one plot update.
    let addedPoint = false;
    proxiesRef.current.forEach((propertyProxy, index) => {
      const value = toFiniteNumber(propertyProxy?.value);
      if (value == null) return;

      const timestamp = safeNowMs(propertyProxy);
      if (timestamp <= (lastTsRef.current[index] ?? -Infinity)) return;

      lastTsRef.current[index] = timestamp;
      modelsRef.current[index].addPoint(timestamp, value);
      addedPoint = true;
    });

    if (addedPoint) setRevision((current) => current + 1);
  }, [isOffline, sampleKey]);

  const series = useMemo<TrendSeries[]>(
    () =>
      seriesMetadata.map((metadata, index) => {
        // Proxies appear before their reset effect on initial connection.
        const data = modelsRef.current[index]?.snapshot() ?? {
          timestamps: new Float64Array(),
          values: new Float64Array(),
        };

        return {
          ...metadata,
          ...data,
          dataPoints: data.values.length,
        };
      }),
    [seriesMetadata, revision]
  );

  return {
    series,
    dataPoints: series.reduce((sum, item) => sum + item.dataPoints, 0),
    isOffline,
  };
};
