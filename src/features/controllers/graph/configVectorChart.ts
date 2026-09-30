import type { ChartConfiguration } from 'chart.js';
import type { DisplayVectorGraphModel } from '@/karabo/common/api';
import {
  axisTitle,
  formatValueTick,
  GRAPH_AXIS_FONT,
  GRAPH_COLORS,
  GRAPH_LAYOUT,
  plotFrame,
  TRACE_COLORS,
  type Range,
} from './configTrendChart';

export const DIMENSION_DOWNSAMPLE = [
  { size: 1500_000, points: 60_000 },
] as const;

export function chooseVectorTargetPoints(length: number) {
  let target = length;
  for (const rule of DIMENSION_DOWNSAMPLE) {
    if (length >= rule.size) target = rule.points;
  }
  return Math.min(target, length);
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

export function vectorPoints(points: Float64Array) {
  const data: { x: number; y: number }[] = [];
  for (let index = 0; index < points.length; index += 2)
    data.push({ x: points[index], y: points[index + 1] });
  return data;
}

export function vectorChartOption(
  model: DisplayVectorGraphModel,
  xRange?: Range,
  yRange?: Range
): ChartConfiguration<'line'> {
  const xTitle = axisTitle(model.x_label, model.x_units);
  const yTitle = axisTitle(model.y_label, model.y_units);
  return {
    type: 'line',
    data: {
      datasets: [
        {
          data: [],
          borderColor: TRACE_COLORS[0],
          backgroundColor: TRACE_COLORS[0],
          borderWidth: GRAPH_LAYOUT.lineWidth,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    },
    plugins: [plotFrame],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      normalized: true,
      events: [],
      layout: {
        autoPadding: false,
        padding: {
          top: model.title ? GRAPH_LAYOUT.titledTop : GRAPH_LAYOUT.insets.top,
          right: GRAPH_LAYOUT.insets.right,
        },
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: {
          type: model.x_log ? 'logarithmic' : 'linear',
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
      },
    },
  };
}
