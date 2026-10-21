import { type PlotSettings } from '@/karabo/common/api';
import type { ChartConfiguration } from 'chart.js';

import { GRAPH_LAYOUT, type Range } from '../common/constants';
import { resolveCurveStyle } from '../common/curveStyle';
import { buildPlotAxes, type PlotAxesConfig } from '../graphAxes';
import { commonChartOption } from '../common/commonConfig';
import type { TrendSeries } from './useTrendModel';

export function trendDatasets(
  series: TrendSeries[],
  plotConfig: PlotSettings
): ChartConfiguration<'line'>['data']['datasets'] {
  return series.map((item, index) => {
    const { label, color } = resolveCurveStyle({
      key: item.key,
      index,
      plotConfig,
    });
    return {
      label,
      data: item.timestamps.map((x, point) => ({ x, y: item.values[point] })),
      borderColor: color,
      backgroundColor: color,
      borderWidth: GRAPH_LAYOUT.lineWidth,
      pointRadius: GRAPH_LAYOUT.trendPointSize,
      pointHoverRadius: GRAPH_LAYOUT.trendPointSize,
      spanGaps: true,
      tension: 0,
      stepped: false,
    };
  });
}

export function trendChartOption(
  plotConfig: PlotSettings,
  series: TrendSeries[],
  xRange?: Range,
  yRange?: Range,
  axes: PlotAxesConfig = buildPlotAxes(plotConfig, { timeX: true }),
  onYAxisWidth?: (width: number) => void
): ChartConfiguration<'line'> {
  const config = commonChartOption(
    plotConfig,
    {
      x: { ...axes.x, range: xRange ?? axes.x.range },
      y: { ...axes.y, range: yRange ?? axes.y.range },
    },
    'line',
    onYAxisWidth
  );
  config.data.datasets = trendDatasets(series, plotConfig);
  return config;
}
