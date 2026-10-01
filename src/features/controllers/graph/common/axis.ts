import type { ChartConfiguration } from 'chart.js';
import type { PlotSettings } from './buildModelConfig';
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
  plotConfig: PlotSettings,
  logarithmicX: boolean,
  xRange?: Range,
  yRange?: Range,
  beginAtZero = false
): ChartScales {
  const xTitle = axisTitle(plotConfig.x_label, plotConfig.x_units);
  const yTitle = axisTitle(plotConfig.y_label, plotConfig.y_units);
  return {
    x: {
      type: logarithmicX ? 'logarithmic' : 'linear',
      position: 'bottom',
      afterFit: (axis) => {
        axis.height = xTitle
          ? GRAPH_LAYOUT.xAxisSize.titled
          : GRAPH_LAYOUT.xAxisSize.untitled;
      },
      reverse: plotConfig.x_invert,
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
        drawOnChartArea: plotConfig.x_grid,
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
      type: plotConfig.y_log ? 'logarithmic' : 'linear',
      beginAtZero: beginAtZero && !plotConfig.y_log,
      position: 'left',
      afterFit: (axis) => {
        axis.width = yTitle
          ? GRAPH_LAYOUT.yAxisSize.titled
          : GRAPH_LAYOUT.yAxisSize.untitled;
      },
      reverse: plotConfig.y_invert,
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
        drawOnChartArea: plotConfig.y_grid,
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
