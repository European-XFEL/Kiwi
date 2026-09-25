import type { EChartsCoreOption } from 'echarts/core';
import type { DisplayTrendGraphModel } from '@/karabo/common/api';
import { Timestamp } from '@/karabo/data/api';
import type { TrendSeries } from './useDisplayTrendGraph';

export type Range = [number, number];

const TRACE_COLORS = [
  '#009be5',
  '#ff0040',
  '#2ca02c',
  '#ff9f1a',
  '#8a2be2',
  '#00a3a3',
];

// Keep a small top and right margin so the white plot's black frame remains visible.
const PLOT_INSETS = { left: 52, right: 2, top: 2, bottom: 34 } as const;
const TITLE_TOP_INSET = 18;

function plotInsets(title: string) {
  return { ...PLOT_INSETS, top: title ? TITLE_TOP_INSET : PLOT_INSETS.top };
}
// Choosing from familiar intervals keeps roughly five readable labels without
// ECharts changing the tick cadence as live data changes the visible range.
const TIME_TICK_INTERVALS = [
  1000,
  5000,
  10_000,
  30_000,
  60_000,
  2 * 60_000,
  5 * 60_000,
  15 * 60_000,
  30 * 60_000,
  60 * 60_000,
  3 * 60 * 60_000,
  6 * 60 * 60_000,
  12 * 60 * 60_000,
  24 * 60 * 60_000,
  2 * 24 * 60 * 60_000,
  7 * 24 * 60 * 60_000,
];

function axisTitle(label: string, units: string) {
  return [label, units ? `(${units})` : ''].filter(Boolean).join(' ');
}

const tickTimeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});
const tickDateFormat = new Intl.DateTimeFormat();
const tickValueFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

function timeTickFormatter(range?: Range) {
  const format =
    range && Math.abs(range[1] - range[0]) > 24 * 60 * 60_000
      ? tickDateFormat
      : tickTimeFormat;
  return (value: number) => format.format(new Date(value));
}

export function formatValueTick(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude < 0.01 || magnitude >= 1e9)) {
    return value
      .toExponential(2)
      .replace(/\.00e/, 'e')
      .replace(/(\.\d)0e/, '$1e');
  }
  return tickValueFormat.format(value);
}

export function formatTrendTime(value: number) {
  return new Timestamp(value / 1000).toLocal(' ', 'seconds');
}

export function fixedYRange(model: DisplayTrendGraphModel): Range | undefined {
  if (model.y_autorange || model.y_min === model.y_max) return undefined;
  return [model.y_min, model.y_max];
}

export function fixedXRange(model: DisplayTrendGraphModel): Range | undefined {
  if (model.x_autorange || model.x_min === model.x_max) return undefined;
  return [model.x_min * 1000, model.x_max * 1000];
}

export function timeTickInterval(range?: Range) {
  if (!range) return undefined;
  const target = Math.abs(range[1] - range[0]) / 5;
  return (
    TIME_TICK_INTERVALS.find((interval) => interval >= target) ??
    TIME_TICK_INTERVALS.at(-1)
  );
}

export function trendPlotBounds(width: number, height: number, title: string) {
  const insets = plotInsets(title);
  return {
    left: insets.left,
    right: width - insets.right,
    top: insets.top,
    bottom: height - insets.bottom,
  };
}

export function trendChartOption(
  model: DisplayTrendGraphModel,
  series: TrendSeries[],
  xRange?: Range,
  yRange?: Range
): EChartsCoreOption {
  const xTitle = axisTitle(model.x_label, model.x_units);
  const yTitle = axisTitle(model.y_label, model.y_units);
  const insets = plotInsets(model.title);

  return {
    animation: false,
    backgroundColor: 'transparent',
    color: TRACE_COLORS,
    title: {
      show: Boolean(model.title),
      text: model.title,
      left: 'center',
      top: 2,
      textStyle: { color: '#000', fontSize: 13, fontWeight: 'normal' },
    },
    legend: {
      show: series.length > 1,
      selectedMode: true,
      left: insets.left + 8,
      top: insets.top + 8,
      padding: 4,
      borderColor: '#000',
      borderWidth: 1,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { color: '#000', fontSize: 12 },
    },
    grid: {
      show: true,
      ...insets,
      // Tick labels must never participate in layout: changing values while
      // following, panning, or zooming must leave the plot rectangle fixed.
      containLabel: false,
      outerBoundsMode: 'none',
      backgroundColor: '#fff',
      borderColor: '#000',
      borderWidth: 1,
    },
    xAxis: {
      type: 'value',
      min: xRange?.[0] ?? null,
      max: xRange?.[1] ?? null,
      interval: timeTickInterval(xRange),
      inverse: model.x_invert,
      name: xTitle,
      nameLocation: 'middle',
      nameGap: xTitle ? 28 : 0,
      nameTextStyle: { color: '#000', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: true },
      axisLabel: {
        color: '#000',
        width: 64,
        overflow: 'truncate',
        hideOverlap: false,
        showMinLabel: false,
        showMaxLabel: false,
        formatter: timeTickFormatter(xRange),
      },
      splitLine: { show: model.x_grid, lineStyle: { color: '#ddd' } },
    },
    yAxis: {
      type: model.y_log ? 'log' : 'value',
      min: yRange?.[0] ?? null,
      max: yRange?.[1] ?? null,
      inverse: model.y_invert,
      name: yTitle,
      nameLocation: 'middle',
      nameGap: yTitle ? 44 : 0,
      nameTextStyle: { color: '#000', fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: true },
      axisLabel: {
        color: '#000',
        width: 36,
        overflow: 'truncate',
        hideOverlap: true,
        verticalAlignMinLabel: model.y_invert ? 'top' : 'bottom',
        verticalAlignMaxLabel: model.y_invert ? 'bottom' : 'top',
        formatter: formatValueTick,
      },
      splitLine: { show: model.y_grid, lineStyle: { color: '#ddd' } },
    },
    series: series.map((item, index) => ({
      id: item.key,
      name: item.key,
      type: 'line',
      data: item.timestamps.map((timestamp, pointIndex) => [
        timestamp,
        item.values[pointIndex],
      ]),
      color: TRACE_COLORS[index % TRACE_COLORS.length],
      connectNulls: true,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { width: 1.5 },
      emphasis: { disabled: true },
      silent: true,
    })),
  };
}
