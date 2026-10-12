import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hash, Timestamp } from '@/karabo/data/api';
import type { Range } from '../common/api';
import type { PropertyProxies } from '../../useController';
import { useIdleScheduler } from '../../useIdleScheduler';
import { trendValue, type TrendMode } from './categories';
import {
  CategoricalTrendModel,
  TrendModel,
  type TrendData,
} from './trendmodel';

const HISTORY_POINT_COUNT = 500;

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
      historyRange: [0, 0] as Range,
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
  // Stable actions read current inputs so live updates only redraw the plot at idle.
  const latest = useRef({ trend, proxies });
  latest.current = { trend, proxies };
  const [, refresh] = useState(0);
  const schedulePublish = useIdleScheduler(1000);

  const publish = useCallback(() => {
    // Collect samples in live arrays, but publish each changed curve only
    // once when the browser has idle time. A timeout keeps busy pages updating.
    schedulePublish(() => {
      // A key/category change may replace the trend while this task is pending.
      const current = latest.current.trend;
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
  }, [schedulePublish]);

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

    publish();
  }, [proxies, trend, publish, mode]);

  useEffect(() => {
    // Follow the controller's proxies and release the previous listeners on updates.
    const unsubscribes = proxies.map((proxy) => {
      const index = trend.curves.findIndex((curve) => curve.key === proxy.key);
      if (index < 0) {
        return undefined;
      }
      // Signal holds owners weakly; the memoized trend keeps these listeners alive.
      return proxy.historic_data.subscribe(trend, (history) => {
        const points: [number, number][] = [];
        for (const sample of history) {
          if (!(sample instanceof Hash) || !sample.has('v')) {
            continue;
          }
          const value = trendValue(sample.getValue('v'), mode);
          if (value === undefined) {
            continue;
          }
          // History carries complete UTC timestamp attributes; keep the instant unchanged.
          // Only convert seconds to milliseconds for the chart.
          const timestamp =
            Timestamp.fromHashAttributes(
              sample.getAttributes('v')
            )!.toTimestamp() * 1000;
          if (Number.isFinite(timestamp)) {
            points.push([timestamp, value]);
          }
        }
        if (!points.length) {
          return;
        }
        points.sort((a, b) => a[0] - b[0]);
        const curve = trend.curves[index];
        // Evaluate late replies against the latest requested interval.
        const accepted = curve.model.setHistory(
          {
            timestamps: points.map(([timestamp]) => timestamp),
            values: points.map(([, value]) => value),
          },
          curve.historyRange
        );
        if (!accepted) {
          return;
        }
        trend.dirtyCurves.add(index);
        publish();
      });
    });
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe?.());
  }, [proxies, trend, mode, publish]);

  const requestHistory = useCallback((range: Range) => {
    if (!range.every(Number.isFinite)) {
      return;
    }
    const { trend, proxies } = latest.current;
    const [start, end] = [...range].sort((a, b) => a - b);
    // The server expects UTC ISO strings without a trailing timezone suffix.
    const timeStart = new Date(start).toISOString().slice(0, -1);
    const timeEnd = new Date(end).toISOString().slice(0, -1);
    for (const proxy of proxies) {
      const curve = trend.curves.find((curve) => curve.key === proxy.key);
      if (!curve) {
        continue;
      }
      curve.historyRange = [start, end];
      proxy.getHistory({
        timeStart,
        timeEnd,
        maxValueCount: HISTORY_POINT_COUNT,
      });
    }
  }, []);

  const resetHistory = useCallback(
    (range: Range) => {
      if (!range.every(Number.isFinite)) {
        return;
      }
      trend.curves.forEach((curve, index) => {
        curve.model.purge();
        trend.dirtyCurves.add(index);
      });
      publish();
      requestHistory(range);
    },
    [trend, publish, requestHistory]
  );

  return {
    requestHistory,
    resetHistory,
    series: trend.series,
    startTime: trend.startTime,
    dataRevision: trend.dataRevision,
  };
}
