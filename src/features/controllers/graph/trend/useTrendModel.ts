import { useEffect, useMemo, useRef, useState } from 'react';
import type { PropertyProxies } from '../../useController';
import { useIdleScheduler } from '../../useIdleScheduler';
import { trendValue, type TrendMode } from './categories';
import {
  CategoricalTrendModel,
  TrendModel,
  type TrendData,
} from './trendmodel';

export type TrendSeries = TrendData & { key: string };

/**
 * Collects timestamped proxy samples into trend series and publishes changed
 * series when the browser is idle. Chart rendering stays with useTrendChart.
 */
export function useTrendModel(
  proxies: PropertyProxies,
  keys: string[],
  mode: TrendMode = 'numeric'
) {
  const keysId = JSON.stringify(keys);
  // Ordered keys and category define history; reconnecting proxies reuse it.
  const trend = useMemo(() => {
    const orderedKeys: string[] = JSON.parse(keysId);
    const curves = orderedKeys.map((key) => ({
      key,
      model:
        mode === 'numeric' ? new TrendModel() : new CategoricalTrendModel(),
      timestamp: -Infinity,
    }));
    return {
      startTime: Date.now(),
      curves,
      dirtyCurves: new Set<number>(),
      dataRevision: 0,
      series: curves.map(({ key, model }): TrendSeries => ({
        key,
        ...model.view(),
      })),
    };
  }, [keysId, mode]);
  const latestTrend = useRef(trend);
  latestTrend.current = trend;
  const [, refresh] = useState(0);
  const schedulePublish = useIdleScheduler(1000);

  useEffect(() => {
    const { curves, startTime, dirtyCurves } = trend;
    for (const [index, proxy] of proxies.entries()) {
      const curve = curves[index];
      if (!curve) {
        continue;
      }
      const value = trendValue(proxy.value, mode);
      if (value === undefined) {
        continue;
      }
      const timestamp = proxy.timestamp?.toTimestamp() * 1000;
      if (!Number.isFinite(value) || !Number.isFinite(timestamp)) {
        continue;
      }
      if (timestamp <= curve.timestamp) {
        continue;
      }

      curve.model.addPoint(timestamp, value);
      // A value last changed before the widget opened is still current.
      if (curve.timestamp === -Infinity && timestamp < startTime) {
        curve.model.addPoint(startTime, value);
      }
      curve.timestamp = Math.max(timestamp, startTime);
      dirtyCurves.add(index);
    }

    if (!dirtyCurves.size) {
      return;
    }

    // Collect samples in live arrays, but publish each changed curve only
    // once when the browser has idle time. A timeout keeps busy pages updating.
    schedulePublish(() => {
      // A key/category change may replace the trend while this task is pending.
      const current = latestTrend.current;
      if (!current.dirtyCurves.size) {
        return;
      }
      current.series = current.series.map((series, index) => {
        if (!current.dirtyCurves.has(index)) {
          return series;
        }
        const { key, model } = current.curves[index];
        return { key, ...model.view() };
      });
      current.dirtyCurves.clear();
      current.dataRevision++;
      refresh((revision) => revision + 1);
    });
  }, [proxies, trend, schedulePublish, mode]);

  return {
    series: trend.series,
    startTime: trend.startTime,
    dataRevision: trend.dataRevision,
  };
}
