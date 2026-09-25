import { useEffect, useRef, useState } from 'react';
import { ProxyStatus } from '@/lib/binding/api';
import type { PropertyProxies } from './useController';
import { useIdleScheduler } from './useIdleScheduler';
import { TrendModel, type TrendData } from '../trendmodel';

export type TrendSeries = TrendData & { key: string };

export function useDisplayTrendGraph(proxies: PropertyProxies, keys: string[]) {
  const [startTime] = useState(Date.now);
  // Keys and proxy order stay fixed for the lifetime of this graph.
  const [curves] = useState(() =>
    keys.map((key) => ({ key, model: new TrendModel(), timestamp: -Infinity }))
  );
  const [{ series, dataRevision }, setPublished] = useState(() => ({
    series: curves.map(({ key, model }): TrendSeries => ({
      key,
      ...model.view(),
    })),
    dataRevision: 0,
  }));

  const dirtyCurves = useRef(new Set<number>());
  const schedulePublish = useIdleScheduler(1000);

  useEffect(() => {
    for (const [index, proxy] of proxies.entries()) {
      const curve = curves[index];
      if (proxy.root.status === ProxyStatus.OFFLINE) continue;
      const raw = proxy.value;
      if (!['number', 'bigint', 'boolean'].includes(typeof raw)) continue;
      const value = Number(raw);
      const timestamp = proxy.timestamp?.toTimestamp() * 1000;
      if (!Number.isFinite(value) || !Number.isFinite(timestamp)) continue;
      if (timestamp <= curve.timestamp) continue;

      curve.model.addPoint(timestamp, value);
      // A value last changed before the widget opened is still current.
      if (curve.timestamp === -Infinity && timestamp < startTime) {
        curve.model.addPoint(startTime, value);
      }
      curve.timestamp = Math.max(timestamp, startTime);
      dirtyCurves.current.add(index);
    }

    if (!dirtyCurves.current.size) return;

    // Collect samples in live arrays, but publish each changed curve only
    // once when the browser has idle time. A timeout keeps busy pages updating.
    schedulePublish(() => {
      const updates = new Map<number, TrendSeries>();
      for (const index of dirtyCurves.current) {
        const { key, model } = curves[index];
        updates.set(index, { key, ...model.view() });
      }
      dirtyCurves.current.clear();
      setPublished((previous) => ({
        series: previous.series.map(
          (series, index) => updates.get(index) ?? series
        ),
        dataRevision: previous.dataRevision + 1,
      }));
    });
  }, [proxies, curves, startTime, schedulePublish]);

  return { series, startTime, dataRevision };
}
