import type { EChartsCoreOption } from 'echarts/core';
import type { DisplayVectorGraphModel } from '@/karabo/common/api';
import { formatValueTick, type Range } from './trendChartConfig';

const PLOT_INSETS = { left: 52, right: 2, top: 2, bottom: 34 } as const;

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
export function vectorSeriesOption(values: number[], indices: number[]) {
  return {
    id: 'vector',
    type: 'line' as const,
    data: indices.map((index, valueIndex) => [index, values[valueIndex]]),
    showSymbol: values.length < 300,
    symbol: 'circle',
    symbolSize: 4,
    lineStyle: { width: 1.5 },
    emphasis: { disabled: true },
    silent: true,
  };
}

export function vectorChartOption(
  model: DisplayVectorGraphModel,
  values: number[],
  indices: number[],
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
    series: [vectorSeriesOption(values, indices)],
  };
}
