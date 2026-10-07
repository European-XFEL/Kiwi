import type { ChartConfiguration, Scale } from 'chart.js';
import type { PlotSettings } from './common/buildModelConfig';
import {
  GRAPH_AXIS_FONT,
  GRAPH_COLORS,
  GRAPH_LAYOUT,
  type Range,
} from './common/constants';
import { trendTimeTicks } from './trend/trendTimeTicks';
import { formatValueTick } from './utils';

export type AxisConfig = {
  kind: 'numeric' | 'time';
  scale: 'linear' | 'logarithmic';
  label: string;
  units: string;
  inverted: boolean;
  grid: boolean;
  range?: Range;
  formatTick?: (value: number) => string;
};

export type PlotAxesConfig = {
  x: AxisConfig;
  y: AxisConfig & {
    kind: 'numeric';
    beginAtZero?: boolean;
    categories?: readonly string[];
  };
};

type PlotAxesOptions = {
  timeX?: boolean;
  categories?: readonly string[];
};

function buildXAxisConfig(
  model: PlotSettings,
  { timeX = false }: PlotAxesOptions
): AxisConfig {
  const min = model.x_min;
  const max = model.x_max;
  const factor = timeX ? 1000 : 1;
  return {
    kind: timeX ? 'time' : 'numeric',
    // Time coordinates stay linear, regardless of x_log.
    scale: !timeX && model.x_log ? 'logarithmic' : 'linear',
    label: model.x_label,
    units: model.x_units,
    inverted: model.x_invert,
    grid: model.x_grid,
    // Configured time ranges are seconds; chart data and navigation use ms.
    range:
      model.x_autorange ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min === max
        ? undefined
        : [min * factor, max * factor],
  };
}

function buildYAxisConfig(
  model: PlotSettings,
  { categories }: PlotAxesOptions
): PlotAxesConfig['y'] {
  const min = model.y_min;
  const max = model.y_max;
  return {
    kind: 'numeric',
    // State/alarm positions stay linear for rendering AND navigation.
    scale: !categories && model.y_log ? 'logarithmic' : 'linear',
    label: model.y_label,
    units: model.y_units,
    inverted: model.y_invert,
    grid: model.y_grid,
    range:
      model.y_autorange ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min === max
        ? undefined
        : [min, max],
    categories,
  };
}

/** Resolves model settings once for chart rendering and range navigation. */
export function buildPlotAxes(
  model: PlotSettings,
  options: PlotAxesOptions = {}
): PlotAxesConfig {
  return {
    x: buildXAxisConfig(model, options),
    y: buildYAxisConfig(model, options),
  };
}

type ChartScales = NonNullable<
  NonNullable<ChartConfiguration<'line'>['options']>['scales']
>;

function formatLogDecade(value: number) {
  if (value === 1) {
    return '1';
  }
  const superscript = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const exponent = String(Math.round(Math.log10(value))).replace(
    /[-\d]/g,
    (digit) => (digit === '-' ? '⁻' : superscript[Number(digit)])
  );
  return `10${exponent}`;
}

export function axisTitle(label: string, units: string) {
  return [label, units ? `(${units})` : ''].filter(Boolean).join(' ');
}

type ChartAxis = NonNullable<ChartScales[string]>;

function buildNumericAxis(
  config: AxisConfig,
  { decadeLabels = false } = {}
): ChartAxis {
  return {
    type: config.scale,
    ticks: {
      // Chart.js autoSkip defaults to true. Skip rather than rotate labels.
      // https://www.chartjs.org/docs/latest/axes/cartesian/#tick-configuration
      maxRotation: 0,
      // Linear includeBounds defaults to true and forces non-nice endpoints.
      // Naturally spaced endpoints still need filtering below.
      // https://www.chartjs.org/docs/latest/axes/cartesian/linear.html
      ...(config.scale === 'linear' ? { includeBounds: false } : {}),
      callback: (value, index, ticks) => {
        if (config.formatTick) {
          return config.formatTick(Number(value));
        }
        if (
          !decadeLabels ||
          config.scale !== 'logarithmic' ||
          !ticks.some((tick) => tick.major)
        ) {
          return formatValueTick(Number(value));
        }
        // Like PyQt, label log Y decades. Empty strings retain minor marks and
        // gridlines; null/undefined would remove them. Narrow views without a
        // decade use numeric labels. Custom formatters take precedence.
        // https://www.chartjs.org/docs/latest/axes/labelling.html
        return ticks[index].major ? formatLogDecade(Number(value)) : '';
      },
    },
  };
}

function buildStateAlarmAxis(
  categories: readonly string[],
  onYAxisWidth?: (width: number) => void
): ChartAxis {
  // State/alarm axes map integer positions to labels and keep every in-range
  // category, including endpoints. The Y layout uses their measured width.
  return {
    type: 'linear',
    afterFit: (scale) => onYAxisWidth?.(scale.width),
    ticks: {
      autoSkip: false,
      callback: (value) =>
        Number.isInteger(Number(value))
          ? (categories[Number(value)] ?? '')
          : '',
    },
    afterBuildTicks: (scale) => {
      scale.ticks = categories.flatMap((_, value) =>
        value >= scale.min && value <= scale.max ? [{ value }] : []
      );
    },
  };
}

function buildTimeTicks(scale: Scale, axes: PlotAxesConfig) {
  const { ctx } = scale.chart;
  const config = axes.x;
  const yTitle = axisTitle(axes.y.label, axes.y.units);
  let yAxisWidth: number = yTitle
    ? GRAPH_LAYOUT.yAxisSize.titled
    : GRAPH_LAYOUT.yAxisSize.untitled;
  if (axes.y.categories) {
    yAxisWidth = scale.chart.scales.y?.width ?? 0;
  }
  const size = Math.min(
    scale.width,
    scale.chart.width - yAxisWidth - GRAPH_LAYOUT.insets.right
  );
  ctx.save();
  ctx.font = `${GRAPH_AXIS_FONT.size}px ${GRAPH_AXIS_FONT.family}`;
  const ticks = trendTimeTicks(
    [scale.min, scale.max],
    size,
    (label) => ctx.measureText(label).width
  );
  let previousRight = -10;
  const visible = ticks.filter(([value, label]) => {
    const width = ctx.measureText(config.formatTick?.(value) ?? label).width;
    const position = ((value - scale.min) / (scale.max - scale.min)) * size;
    const left = position - width / 2;
    const right = position + width / 2;
    // Keep labels inside the plot with ten pixels between them, including
    // ticks from different calendar intervals near midnight.
    if (left < 0 || right > size || left < previousRight + 10) {
      return false;
    }
    previousRight = right;
    return true;
  });
  ctx.restore();
  return visible;
}

function buildTimeAxis(axes: PlotAxesConfig): ChartAxis {
  const config = axes.x;
  // Time uses our measured intervals on a linear millisecond scale rather
  // than Chart.js's date adapter. Centering avoids shifted edge-label overlap.
  let tickLabels = new Map<number, string>();
  return {
    type: 'linear',
    ticks: {
      autoSkip: false,
      maxRotation: 0,
      align: 'center',
      callback: (value) =>
        config.formatTick?.(Number(value)) ??
        tickLabels.get(Number(value)) ??
        '',
    },
    afterBuildTicks: (scale) => {
      const ticks = buildTimeTicks(scale, axes);
      tickLabels = new Map(ticks);
      scale.ticks = ticks.map(([value]) => ({ value }));
    },
  };
}

function buildXAxis(axes: PlotAxesConfig): ChartAxis {
  const config = axes.x;
  const title = axisTitle(config.label, config.units);
  const axis =
    config.kind === 'time' ? buildTimeAxis(axes) : buildNumericAxis(config);
  return {
    ...axis,
    position: 'bottom',
    // Reverse changes pixel direction without exchanging bounds.
    reverse: config.inverted,
    min: config.range?.[0],
    max: config.range?.[1],
    afterFit: (scale) => {
      // Fixed gutters keep the plot stable when zooming or formatting changes.
      scale.height = title
        ? GRAPH_LAYOUT.xAxisSize.titled
        : GRAPH_LAYOUT.xAxisSize.untitled;
    },
    // Titles combine labels and units; shared fonts and zero extra padding.
    title: {
      display: !!title,
      text: title,
      color: GRAPH_COLORS.frame,
      font: GRAPH_AXIS_FONT,
      padding: 0,
    },
    grid: {
      // The model controls interior grids; tick marks and frame remain.
      drawOnChartArea: config.grid,
      color: GRAPH_COLORS.grid,
      tickLength: 4,
    },
    border: { color: GRAPH_COLORS.frame },
    ticks: {
      color: GRAPH_COLORS.frame,
      font: GRAPH_AXIS_FONT,
      padding: 2,
      // Numeric edge labels stay inside the available width. Time overrides
      // this with centered labels and measures their extents before drawing.
      align: 'inner',
      ...axis.ticks,
    },
  };
}

function buildYAxis(
  axes: PlotAxesConfig,
  onYAxisWidth?: (width: number) => void
): ChartAxis {
  const config = axes.y;
  const title = axisTitle(config.label, config.units);
  const axis = config.categories
    ? buildStateAlarmAxis(config.categories, onYAxisWidth)
    : buildNumericAxis(config, { decadeLabels: true });
  return {
    position: 'left',
    beginAtZero: !!config.beginAtZero && config.scale !== 'logarithmic',
    // Inversion affects display direction, including log Y, not numeric bounds.
    reverse: config.inverted,
    min: config.range?.[0],
    max: config.range?.[1],
    afterFit: (scale) => {
      // Numeric Y has a fixed gutter. State/alarm overrides this with its
      // measured-width callback from the builder above.
      scale.width = title
        ? GRAPH_LAYOUT.yAxisSize.titled
        : GRAPH_LAYOUT.yAxisSize.untitled;
    },
    ...axis,
    title: {
      display: !!title,
      text: title,
      color: GRAPH_COLORS.frame,
      font: GRAPH_AXIS_FONT,
      padding: 0,
    },
    grid: {
      drawOnChartArea: config.grid,
      color: GRAPH_COLORS.grid,
      tickLength: 4,
    },
    border: { color: GRAPH_COLORS.frame },
    ticks: {
      color: GRAPH_COLORS.frame,
      font: GRAPH_AXIS_FONT,
      padding: 2,
      ...axis.ticks,
    },
  };
}

/** Shared frame, fonts and compact layout intended to resemble KaraboGUI. */
export function chartAxes(
  axes: PlotAxesConfig,
  onYAxisWidth?: (width: number) => void
): ChartScales {
  return {
    x: buildXAxis(axes),
    y: buildYAxis(axes, onYAxisWidth),
  };
}
