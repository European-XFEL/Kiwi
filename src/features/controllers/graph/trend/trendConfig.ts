import type { ChartConfiguration } from 'chart.js';
import type { PlotSettings } from '../common/buildModelConfig';
import { GRAPH_LAYOUT, TRACE_COLORS, type Range } from '../common/constants';
import { buildPlotAxes, type PlotAxesConfig } from '../graphAxes';
import { commonChartOption } from '../common/commonConfig';
import type { TrendSeries } from './useTrendModel';

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
    tension: 0,
    stepped: false,
  }));
}

export function trendChartOption(
  plotConfig: PlotSettings,
  series: TrendSeries[],
  xRange?: Range,
  yRange?: Range,
  axes: PlotAxesConfig = buildPlotAxes(plotConfig, { timeX: true })
): ChartConfiguration<'line'> {
  const config = commonChartOption(plotConfig, {
    x: { ...axes.x, range: xRange ?? axes.x.range },
    y: { ...axes.y, range: yRange ?? axes.y.range },
  });
  config.data.datasets = trendDatasets(series);
  return config;
}
