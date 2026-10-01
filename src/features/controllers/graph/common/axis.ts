import type { ChartConfiguration } from 'chart.js';
import type { BasePlotModel } from '@/karabo/common/api';
import {
  GRAPH_AXIS_FONT,
  GRAPH_COLORS,
  GRAPH_LAYOUT,
  type Range,
} from './constants';

type ChartScales = NonNullable<
  NonNullable<ChartConfiguration<'line'>['options']>['scales']
>;

export function axisTitle(label: string, units: string) {
  return [label, units ? `(${units})` : ''].filter(Boolean).join(' ');
}

const tickValueFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});
export function formatValueTick(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude < 0.01 || magnitude >= 1e9))
    return value
      .toExponential(2)
      .replace(/\.00e/, 'e')
      .replace(/(\.\d)0e/, '$1e');
  return tickValueFormat.format(value);
}

export function chartAxes(
  model: BasePlotModel,
  logarithmicX: boolean,
  xRange?: Range,
  yRange?: Range,
  beginAtZero = false
): ChartScales {
  const xTitle = axisTitle(model.x_label, model.x_units);
  const yTitle = axisTitle(model.y_label, model.y_units);
  return {
    x: {
      type: logarithmicX ? 'logarithmic' : 'linear',
      position: 'bottom',
      afterFit: (axis) => {
        axis.height = xTitle
          ? GRAPH_LAYOUT.xAxisSize.titled
          : GRAPH_LAYOUT.xAxisSize.untitled;
      },
      reverse: model.x_invert,
      min: xRange?.[0],
      max: xRange?.[1],
      title: {
        display: !!xTitle,
        text: xTitle,
        color: GRAPH_COLORS.frame,
        font: GRAPH_AXIS_FONT,
        padding: 0,
      },
      grid: {
        drawOnChartArea: model.x_grid,
        color: GRAPH_COLORS.grid,
        tickLength: 4,
      },
      border: { color: GRAPH_COLORS.frame },
      ticks: {
        color: GRAPH_COLORS.frame,
        font: GRAPH_AXIS_FONT,
        padding: 2,
        align: 'inner',
        callback: (value) => formatValueTick(Number(value)),
      },
    },
    y: {
      type: model.y_log ? 'logarithmic' : 'linear',
      beginAtZero: beginAtZero && !model.y_log,
      position: 'left',
      afterFit: (axis) => {
        axis.width = yTitle
          ? GRAPH_LAYOUT.yAxisSize.titled
          : GRAPH_LAYOUT.yAxisSize.untitled;
      },
      reverse: model.y_invert,
      min: yRange?.[0],
      max: yRange?.[1],
      title: {
        display: !!yTitle,
        text: yTitle,
        color: GRAPH_COLORS.frame,
        font: GRAPH_AXIS_FONT,
        padding: 0,
      },
      grid: {
        drawOnChartArea: model.y_grid,
        color: GRAPH_COLORS.grid,
        tickLength: 4,
      },
      border: { color: GRAPH_COLORS.frame },
      ticks: {
        color: GRAPH_COLORS.frame,
        font: GRAPH_AXIS_FONT,
        padding: 2,
        callback: (value) => formatValueTick(Number(value)),
      },
    },
  };
}
