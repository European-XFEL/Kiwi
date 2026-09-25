import type { EChartsCoreOption } from 'echarts/core';
import type { DisplayVectorGraphModel } from '@/karabo/common/api';
import { formatValueTick, type Range } from './trendChartConfig';

const PLOT_INSETS = { left: 52, right: 2, top: 2, bottom: 34 } as const;

export const DIMENSION_DOWNSAMPLE = [
  { size: 200_000, points: 30_000 },
  { size: 300_000, points: 40_000 },
  { size: 400_000, points: 50_000 },
  { size: 500_000, points: 60_000 },
] as const;

export function chooseVectorTargetPoints(length: number) {
  let target = length;
  for (const rule of DIMENSION_DOWNSAMPLE) {
    if (length >= rule.size) target = rule.points;
  }
  return Math.min(target, length);
}

function axisTitle(label: string, units: string) {
  return [label, units ? `(${units})` : ''].filter(Boolean).join(' ');
}

export function vectorPlotBounds(width: number, height: number, title: string) {
  const top = title ? 18 : PLOT_INSETS.top;
  return {
    left: PLOT_INSETS.left,
    right: width - PLOT_INSETS.right,
    top,
    bottom: height - PLOT_INSETS.bottom,
  };
}

export function fixedVectorRange(
  autorange: boolean,
  min: number,
  max: number
): Range | undefined {
  return autorange ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min === max
    ? undefined
    : [min, max];
}

export function visibleVectorRange(
  pointCount: number,
  range?: Range,
  logarithmic = false
) {
  if (!range || pointCount === 0) return [0, pointCount] as const;

  const [min, max] = range;
  const ratio = max / min;
  const logarithmicPadding = logarithmic && min > 0 && ratio > 1;
  const span = max - min;
  const paddedMin = logarithmicPadding ? min / ratio : min - span;
  const paddedMax = logarithmicPadding ? max * ratio : max + span;
  if (paddedMax < 0 || paddedMin > pointCount - 1) return [0, 0] as const;

  const firstPoint = Math.max(0, Math.floor(paddedMin));
  const lastPoint = Math.min(pointCount, Math.ceil(paddedMax) + 1);
  return [firstPoint, Math.max(firstPoint, lastPoint)] as const;
}

export function vectorSeriesOption(points: Float64Array) {
  return {
    id: 'vector',
    type: 'line' as const,
    data: points,
    dimensions: ['x', 'y'],
    encode: { x: 'x', y: 'y' },
    showSymbol: points.length / 2 < 300,
    symbol: 'circle',
    symbolSize: 4,
    lineStyle: { width: 1.5 },
    sampling: 'none' as const,
    emphasis: { disabled: true },
    silent: true,
  };
}

export function vectorChartOption(
  model: DisplayVectorGraphModel,
  points: Float64Array,
  xRange?: Range,
  yRange?: Range
): EChartsCoreOption {
  const top = model.title ? 18 : PLOT_INSETS.top;
  return {
    animation: false,
    backgroundColor: 'transparent',
    title: {
      show: Boolean(model.title),
      text: model.title,
      left: 'center',
      top: 2,
      textStyle: { color: '#000', fontSize: 13, fontWeight: 'normal' },
    },
    grid: {
      show: true,
      ...PLOT_INSETS,
      top,
      containLabel: false,
      outerBoundsMode: 'none',
      backgroundColor: '#fff',
      borderColor: '#000',
      borderWidth: 1,
    },
    xAxis: {
      type: model.x_log ? 'log' : 'value',
      min: xRange?.[0] ?? null,
      max: xRange?.[1] ?? null,
      inverse: model.x_invert,
      name: axisTitle(model.x_label, model.x_units),
      nameLocation: 'middle',
      nameGap: model.x_label || model.x_units ? 28 : 0,
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
        formatter: formatValueTick,
      },
      splitLine: { show: model.x_grid, lineStyle: { color: '#ddd' } },
    },
    yAxis: {
      type: model.y_log ? 'log' : 'value',
      min: yRange?.[0] ?? null,
      max: yRange?.[1] ?? null,
      inverse: model.y_invert,
      name: axisTitle(model.y_label, model.y_units),
      nameLocation: 'middle',
      nameGap: model.y_label || model.y_units ? 44 : 0,
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
    series: [vectorSeriesOption(points)],
  };
}
