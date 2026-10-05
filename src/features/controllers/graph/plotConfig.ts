import type { ChartConfiguration, ScriptableContext } from 'chart.js';
import type { PlotSettings } from './common/buildModelConfig';
import { GRAPH_LAYOUT, TRACE_COLORS, type Range } from './common/constants';
import { commonChartOption } from './common/commonConfig';
import { buildPlotAxes, type PlotAxesConfig } from './graphAxes';
import { vectorBarPlugin } from './graphPlugins';
import { VECTOR_POINT_LIMIT } from './utils';

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
    context.dataIndex === context.dataset.data.length - 1 ? 'red' : 'blue';
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
  xRange?: Range,
  yRange?: Range,
  axes: PlotAxesConfig = buildPlotAxes(plotConfig)
): ChartConfiguration<'line'> {
  const config = commonChartOption(plotConfig, {
    x: { ...axes.x, range: xRange ?? axes.x.range },
    y: { ...axes.y, range: yRange ?? axes.y.range },
  });
  if (plotConfig.step < 0) {
    config.options!.parsing = {};
    config.options!.normalized = false;
  }
  Object.assign(config.data.datasets[0], {
    borderColor: TRACE_COLORS[0],
    backgroundColor: TRACE_COLORS[0],
    borderWidth: GRAPH_LAYOUT.lineWidth,
    pointRadius: 0,
    pointHoverRadius: 0,
  });
  return config;
}

export function vectorXYChartOption(
  plotConfig: PlotSettings,
  keys: readonly string[],
  axes: PlotAxesConfig = buildPlotAxes(plotConfig)
): ChartConfiguration<'line'> {
  const config = commonChartOption(plotConfig, axes);
  config.options!.parsing = {};
  config.options!.normalized = false;
  config.data.datasets = keys.map((key, index) => ({
    label: key,
    data: [],
    borderColor: TRACE_COLORS[index % TRACE_COLORS.length],
    backgroundColor: TRACE_COLORS[index % TRACE_COLORS.length],
    borderWidth: GRAPH_LAYOUT.lineWidth,
    pointRadius: (context: ScriptableContext<'line'>) =>
      context.dataset.data.length < VECTOR_POINT_LIMIT
        ? GRAPH_LAYOUT.vectorPointSize
        : 0,
    pointHoverRadius: 0,
    tension: 0,
  }));
  return config;
}

export function barChartOption(
  plotConfig: PlotSettings,
  xRange?: Range,
  yRange?: Range,
  axes: PlotAxesConfig = buildPlotAxes(plotConfig, { bar: true })
): ChartConfiguration<'line'> {
  const config = commonChartOption(plotConfig, {
    x: { ...axes.x, range: xRange ?? axes.x.range },
    y: { ...axes.y, range: yRange ?? axes.y.range },
  });
  config.data.datasets[0].showLine = false;
  config.data.datasets[0].pointRadius = 0;
  config.plugins = [
    ...(config.plugins ?? []),
    vectorBarPlugin(plotConfig.bar_width),
  ];
  return config;
}
