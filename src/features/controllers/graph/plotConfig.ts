import type { ChartConfiguration, Point, ScriptableContext } from 'chart.js';
import type { PlotSettings } from './common/buildModelConfig';
import {
  GRAPH_LAYOUT,
  BAR_BLUE,
  SCATTER_BLUE,
  SCATTER_RED,
  type Range,
} from './common/constants';
import { resolveCurveStyle } from './common/curveStyle';
import { commonChartOption } from './common/commonConfig';
import { buildPlotAxes, type PlotAxesConfig } from './graphAxes';

export function scatterChartOption(
  plotConfig: PlotSettings,
  axes: PlotAxesConfig = buildPlotAxes(plotConfig)
) {
  const config = commonChartOption(plotConfig, axes, 'scatter');
  // Scatter samples may repeat X or arrive in any X order. Let Chart.js parse
  // them instead of promising sorted, normalized data to the controller.
  config.options!.parsing = {};
  config.options!.normalized = false;
  const color = (context: ScriptableContext<'scatter'>) =>
    context.dataIndex === context.dataset.data.length - 1
      ? SCATTER_RED
      : SCATTER_BLUE;
  Object.assign(config.data.datasets[0], {
    showLine: false,
    pointRadius: plotConfig.psize / 2,
    pointHoverRadius: plotConfig.psize / 2,
    pointBorderWidth: 0,
    pointBackgroundColor: color,
    pointBorderColor: color,
  });
  return config;
}

export function vectorChartOption(
  plotConfig: PlotSettings,
  keys: readonly string[] = [],
  axes: PlotAxesConfig = buildPlotAxes(plotConfig)
): ChartConfiguration<'line'> {
  const config = commonChartOption(plotConfig, axes);
  if (plotConfig.step < 0) {
    config.options!.parsing = {};
    config.options!.normalized = false;
  }
  config.data.datasets = keys.map((key, index) => {
    const { label, color } = resolveCurveStyle({ key, index, plotConfig });
    return {
      label,
      data: [],
      borderColor: color,
      backgroundColor: color,
      borderWidth: GRAPH_LAYOUT.lineWidth,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
    };
  });
  return config;
}

export function vectorXYChartOption(
  plotConfig: PlotSettings,
  keys: readonly string[],
  axes: PlotAxesConfig = buildPlotAxes(plotConfig)
): ChartConfiguration<'line'> {
  const config = vectorChartOption(
    { ...plotConfig, curve_options: [] },
    keys,
    axes
  );
  config.options!.parsing = {};
  config.options!.normalized = false;
  return config;
}

export function vectorScatterChartOption(
  plotConfig: PlotSettings,
  keys: readonly string[],
  axes: PlotAxesConfig = buildPlotAxes(plotConfig)
): ChartConfiguration<'line'> {
  const config = vectorXYChartOption(plotConfig, keys, axes);
  config.data.datasets.forEach((dataset) => {
    Object.assign(dataset, {
      showLine: false,
      pointRadius: plotConfig.psize / 2,
      pointHoverRadius: plotConfig.psize / 2,
      pointBorderWidth: 0,
      pointBackgroundColor: SCATTER_BLUE,
      pointBorderColor: SCATTER_BLUE,
    });
  });
  return config;
}

export function barChartOption(
  plotConfig: PlotSettings,
  xRange?: Range,
  yRange?: Range,
  axes: PlotAxesConfig = buildPlotAxes(plotConfig)
): ChartConfiguration<'bar', Point[]> {
  const config = commonChartOption(
    plotConfig,
    {
      x: { ...axes.x, range: xRange ?? axes.x.range },
      y: { ...axes.y, range: yRange ?? axes.y.range, beginAtZero: true },
    },
    'bar'
  );
  Object.assign(config.data.datasets[0], {
    backgroundColor: BAR_BLUE,
    borderColor: 'black',
    borderWidth: 1,
    inflateAmount: 0,
    grouped: false,
    categoryPercentage: 1,
    barPercentage: Math.min(plotConfig.bar_width, 1),
    clip: 0,
  });
  const xAxis = config.options!.scales!.x!;
  xAxis.offset = false;
  xAxis.grid!.offset = false;
  return config;
}
