import type { ChartConfiguration, Plugin, ScriptableContext } from 'chart.js';
import type { PlotSettings } from './common/buildModelConfig';
import {
  GRAPH_AXIS_FONT,
  GRAPH_COLORS,
  GRAPH_LAYOUT,
  TRACE_COLORS,
  type Range,
} from './common/constants';
import { trendTimeTicks } from './trend/trendTimeTicks';
import type { TrendSeries } from './trend/useTrendModel';
import { vectorBarPlugin } from './vectorBarPlugin';
import { formatValueTick } from './utils';

type ChartScales = NonNullable<
  NonNullable<ChartConfiguration<'line'>['options']>['scales']
>;

export function axisTitle(label: string, units: string) {
  return [label, units ? `(${units})` : ''].filter(Boolean).join(' ');
}

export type AxisConfig = {
  kind: 'numeric' | 'time';
  scale: 'linear' | 'logarithmic';
  label: string;
  units: string;
  inverted: boolean;
  grid: boolean;
  range?: Range;
  beginAtZero?: boolean;
  formatTick?: (value: number) => string;
  categories?: readonly string[];
  onYAxisWidth?: (width: number) => void;
};

export type PlotAxesConfig = { x: AxisConfig; y: AxisConfig };

/** Converts configured time ranges from model seconds to chart milliseconds. */
export function buildPlotAxes(
  model: PlotSettings,
  {
    timeX = false,
    bar = false,
    categories,
    onYAxisWidth,
  }: {
    timeX?: boolean;
    bar?: boolean;
    categories?: readonly string[];
    onYAxisWidth?: (width: number) => void;
  } = {}
): PlotAxesConfig {
  const build = (key: 'x' | 'y'): AxisConfig => {
    const time = key === 'x' && timeX;
    const min = model[`${key}_min`];
    const max = model[`${key}_max`];
    return {
      kind: time ? 'time' : 'numeric',
      scale:
        !time &&
        !(bar && key === 'x') &&
        !(categories && key === 'y') &&
        model[`${key}_log`]
          ? 'logarithmic'
          : 'linear',
      label: model[`${key}_label`],
      units: model[`${key}_units`],
      inverted: model[`${key}_invert`],
      grid: model[`${key}_grid`],
      range:
        model[`${key}_autorange`] ||
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min === max
          ? undefined
          : [min * (time ? 1000 : 1), max * (time ? 1000 : 1)],
      beginAtZero: bar && key === 'y',
      categories: key === 'y' ? categories : undefined,
      onYAxisWidth: key === 'y' ? onYAxisWidth : undefined,
    };
  };
  return { x: build('x'), y: build('y') };
}

export function chartAxes(axes: PlotAxesConfig): ChartScales {
  const xTitle = axisTitle(axes.x.label, axes.x.units);
  const yTitle = axisTitle(axes.y.label, axes.y.units);
  const scales: ChartScales = {
    x: {
      type: axes.x.kind === 'time' ? 'linear' : axes.x.scale,
      position: 'bottom',
      afterFit: (axis) => {
        axis.height = xTitle
          ? GRAPH_LAYOUT.xAxisSize.titled
          : GRAPH_LAYOUT.xAxisSize.untitled;
      },
      reverse: axes.x.inverted,
      min: axes.x.range?.[0],
      max: axes.x.range?.[1],
      title: {
        display: !!xTitle,
        text: xTitle,
        color: GRAPH_COLORS.frame,
        font: GRAPH_AXIS_FONT,
        padding: 0,
      },
      grid: {
        drawOnChartArea: axes.x.grid,
        color: GRAPH_COLORS.grid,
        tickLength: 4,
      },
      border: { color: GRAPH_COLORS.frame },
      ticks: {
        color: GRAPH_COLORS.frame,
        font: GRAPH_AXIS_FONT,
        padding: 2,
        align: 'inner',
        callback: (value) =>
          (axes.x.formatTick ?? formatValueTick)(Number(value)),
      },
    },
    y: {
      type: axes.y.kind === 'time' ? 'linear' : axes.y.scale,
      beginAtZero: !!axes.y.beginAtZero && axes.y.scale !== 'logarithmic',
      position: 'left',
      afterFit: (axis) => {
        if (!axes.y.categories) {
          axis.width = yTitle
            ? GRAPH_LAYOUT.yAxisSize.titled
            : GRAPH_LAYOUT.yAxisSize.untitled;
        }
        axes.y.onYAxisWidth?.(axis.width);
      },
      reverse: axes.y.inverted,
      min: axes.y.range?.[0],
      max: axes.y.range?.[1],
      title: {
        display: !!yTitle,
        text: yTitle,
        color: GRAPH_COLORS.frame,
        font: GRAPH_AXIS_FONT,
        padding: 0,
      },
      grid: {
        drawOnChartArea: axes.y.grid,
        color: GRAPH_COLORS.grid,
        tickLength: 4,
      },
      border: { color: GRAPH_COLORS.frame },
      ticks: {
        color: GRAPH_COLORS.frame,
        font: GRAPH_AXIS_FONT,
        padding: 2,
        callback: (value) =>
          axes.y.categories
            ? Number.isInteger(Number(value))
              ? (axes.y.categories[Number(value)] ?? '')
              : ''
            : (axes.y.formatTick ?? formatValueTick)(Number(value)),
      },
    },
  };
  if (axes.y.categories) {
    scales.y!.ticks = { ...scales.y!.ticks, autoSkip: false };
    scales.y!.afterBuildTicks = (axis) => {
      axis.ticks = axes.y.categories!.flatMap((_, value) =>
        value >= axis.min && value <= axis.max ? [{ value }] : []
      );
    };
  }
  for (const key of ['x', 'y'] as const) {
    if (axes[key].kind !== 'time') continue;
    const axis = scales[key]!;
    let tickLabels = new Map<number, string>();
    axis.ticks = {
      ...axis.ticks,
      autoSkip: false,
      maxRotation: 0,
      callback: (value) =>
        axes[key].formatTick?.(Number(value)) ??
        tickLabels.get(Number(value)) ??
        '',
    };
    axis.afterBuildTicks = (scale) => {
      const { ctx } = scale.chart;
      const yAxisWidth = axes.y.categories
        ? (scale.chart.scales.y?.width ?? 0)
        : yTitle
          ? GRAPH_LAYOUT.yAxisSize.titled
          : GRAPH_LAYOUT.yAxisSize.untitled;
      const size =
        key === 'x'
          ? Math.min(
              scale.width,
              scale.chart.width - yAxisWidth - GRAPH_LAYOUT.insets.right
            )
          : scale.height;
      ctx.save();
      ctx.font = `${GRAPH_AXIS_FONT.size}px ${GRAPH_AXIS_FONT.family}`;
      const ticks = trendTimeTicks(
        [scale.min, scale.max],
        size,
        (label) => ctx.measureText(label).width
      );
      ctx.restore();
      tickLabels = new Map(ticks);
      scale.ticks = ticks.map(([value]) => ({ value }));
    };
  }
  return scales;
}

export const plotFrame: Plugin<'line' | 'scatter'> = {
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

export function commonChartOption(
  plotConfig: PlotSettings,
  axes: PlotAxesConfig
): ChartConfiguration<'line'>;
export function commonChartOption(
  plotConfig: PlotSettings,
  axes: PlotAxesConfig,
  type: 'scatter'
): ChartConfiguration<'scatter'>;
export function commonChartOption(
  plotConfig: PlotSettings,
  axes: PlotAxesConfig,
  type: 'line' | 'scatter' = 'line'
): ChartConfiguration<'line' | 'scatter'> {
  return {
    type,
    data: { datasets: [{ data: [] }] },
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
          top: plotConfig.title
            ? GRAPH_LAYOUT.titledTop
            : GRAPH_LAYOUT.insets.top,
          right: GRAPH_LAYOUT.insets.right,
        },
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: chartAxes(axes),
    },
  };
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
