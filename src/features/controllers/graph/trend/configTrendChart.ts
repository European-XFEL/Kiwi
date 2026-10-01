import type { ChartConfiguration } from 'chart.js';
import type { DisplayTrendGraphModel } from '@/karabo/common/api';
import { Timestamp } from '@/karabo/data/api';
import type { TrendSeries } from './useTrendModel';
import { trendTimeTicks } from './trendTimeTicks';
import {
  axisTitle,
  commonChartOption,
  GRAPH_AXIS_FONT,
  GRAPH_LAYOUT,
  TRACE_COLORS,
  type Range,
} from '../common/api';

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
  const config = commonChartOption(model, false, xRange, yRange);
  config.data.datasets = trendDatasets(series);
  const x = config.options!.scales!.x!;
  const yAxisWidth = axisTitle(model.y_label, model.y_units)
    ? GRAPH_LAYOUT.yAxisSize.titled
    : GRAPH_LAYOUT.yAxisSize.untitled;
  let tickLabels = new Map<number, string>();
  x.ticks = {
    ...x.ticks,
    autoSkip: false,
    maxRotation: 0,
    callback: (value) => tickLabels.get(value as number) ?? '',
  };
  x.afterBuildTicks = (scale) => {
    const { ctx } = scale.chart;
    const plotWidth = Math.min(
      scale.width,
      scale.chart.width - yAxisWidth - GRAPH_LAYOUT.insets.right
    );
    ctx.save();
    ctx.font = `${GRAPH_AXIS_FONT.size}px ${GRAPH_AXIS_FONT.family}`;
    const ticks = trendTimeTicks(
      [scale.min, scale.max],
      plotWidth,
      (label) => ctx.measureText(label).width
    );
    ctx.restore();
    tickLabels = new Map(ticks);
    scale.ticks = ticks.map(([value]) => ({ value }));
  };
  return config;
}
