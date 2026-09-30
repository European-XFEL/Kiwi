import type { ChartConfiguration, Plugin } from 'chart.js';
import type { DisplayTrendGraphModel } from '@/karabo/common/api';
import { Timestamp } from '@/karabo/data/api';
import type { TrendSeries } from './useTrendModel';
import { trendTimeTicks } from './trendTimeTicks';

export type Range = [number, number];
export const TRACE_COLORS = [
  '#009be5',
  '#ff0040',
  '#2ca02c',
  '#ff9f1a',
  '#8a2be2',
  '#00a3a3',
];
export const GRAPH_AXIS_FONT = {
  family: 'Source Sans Pro, sans-serif',
  size: 13.333,
};
export const GRAPH_LAYOUT = {
  insets: { right: 2, top: 2 },
  titledTop: 18,
  xAxisSize: { titled: 42, untitled: 34 },
  yAxisSize: { titled: 68, untitled: 52 },
  lineWidth: 1.5,
  trendPointSize: 2.5,
  vectorPointSize: 2,
  vectorPointLimit: 300,
} as const;
export const GRAPH_COLORS = {
  plotBackground: '#fff',
  frame: '#000',
  grid: '#ddd',
} as const;

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

export const plotFrame: Plugin<'line'> = {
  id: 'kiwiPlotFrame',
  beforeDraw(chart) {
    const { left, top, width, height } = chart.chartArea;
    chart.ctx.fillStyle = GRAPH_COLORS.plotBackground;
    chart.ctx.fillRect(left, top, width, height);
  },
  afterDraw(chart) {
    const { left, top, width, height } = chart.chartArea;
    chart.ctx.strokeStyle = GRAPH_COLORS.frame;
    chart.ctx.lineWidth = 1;
    chart.ctx.strokeRect(left, top, width, height);
  },
};

export function trendDatasets(
  series: TrendSeries[]
): ChartConfiguration<'line'>['data']['datasets'] {
  return series.map((item, index) => ({
    label: item.key,
    data: item.timestamps.map((x, point) => ({ x, y: item.values[point] })),
    borderColor: TRACE_COLORS[index % TRACE_COLORS.length],
    backgroundColor: TRACE_COLORS[index % TRACE_COLORS.length],
    borderWidth: GRAPH_LAYOUT.lineWidth,
    pointRadius: GRAPH_LAYOUT.trendPointSize,
    pointHoverRadius: GRAPH_LAYOUT.trendPointSize,
    spanGaps: true,
  }));
}

export function trendChartOption(
  model: DisplayTrendGraphModel,
  series: TrendSeries[],
  xRange?: Range,
  yRange?: Range
): ChartConfiguration<'line'> {
  const xTitle = axisTitle(model.x_label, model.x_units);
  const yTitle = axisTitle(model.y_label, model.y_units);
  let tickLabels = new Map<number, string>();
  return {
    type: 'line',
    data: { datasets: trendDatasets(series) },
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
          type: 'linear',
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
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => tickLabels.get(value as number) ?? '',
          },
          afterBuildTicks: (scale) => {
            const { ctx } = scale.chart;
            ctx.save();
            ctx.font = `${GRAPH_AXIS_FONT.size}px ${GRAPH_AXIS_FONT.family}`;
            const ticks = trendTimeTicks(
              [scale.min, scale.max],
              scale.width,
              (label) => ctx.measureText(label).width
            );
            ctx.restore();
            tickLabels = new Map(ticks);
            scale.ticks = ticks.map(([value]) => ({ value }));
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
