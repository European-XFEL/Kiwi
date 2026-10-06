import type { ChartConfiguration } from 'chart.js';
import type { PlotSettings } from './buildModelConfig';
import { GRAPH_LAYOUT } from './constants';
import { plotFrame } from './plotFrame';
import { chartAxes, type PlotAxesConfig } from '../graphAxes';

export function commonChartOption(
  plotConfig: PlotSettings,
  axes: PlotAxesConfig,
  type?: 'line',
  onYAxisWidth?: (width: number) => void
): ChartConfiguration<'line'>;
export function commonChartOption(
  plotConfig: PlotSettings,
  axes: PlotAxesConfig,
  type: 'scatter',
  onYAxisWidth?: (width: number) => void
): ChartConfiguration<'scatter'>;
export function commonChartOption(
  plotConfig: PlotSettings,
  axes: PlotAxesConfig,
  type: 'line' | 'scatter' = 'line',
  onYAxisWidth?: (width: number) => void
): ChartConfiguration<'line' | 'scatter'> {
  return {
    type,
    data: { datasets: [{ data: [] }] },
    // Paint a white plot area before datasets and a complete border afterward;
    // the frame remains visible even when endpoint ticks/gridlines are absent.
    plugins: [plotFrame],
    options: {
      // Follow the container's size; the graph layout supplies height rather
      // than deriving it from Chart.js's default aspect ratio.
      // https://www.chartjs.org/docs/latest/configuration/responsive.html
      responsive: true,
      maintainAspectRatio: false,
      // Live data and viewport updates draw immediately, without transitions.
      animation: false,
      // Controllers supply internal numeric {x, y} coordinates. normalized
      // tells Chart.js the indices are unique, sorted and consistent across
      // datasets; data preparation remains responsible for that contract.
      // https://www.chartjs.org/docs/latest/general/performance.html
      parsing: false,
      normalized: true,
      // Mouse gestures belong to useMouseGestures; avoid Chart.js hover work.
      events: [],
      layout: {
        // Explicit insets and axis gutters keep the plot stable during zoom.
        // Reserve extra top space for our title; no automatic overflow padding.
        autoPadding: false,
        padding: {
          top: plotConfig.title
            ? GRAPH_LAYOUT.titledTop
            : GRAPH_LAYOUT.insets.top,
          right: GRAPH_LAYOUT.insets.right,
        },
      },
      // The surrounding graph UI owns series controls and cursor information.
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      // Shared axes retain Chart.js numeric generation/autoSkip defaults;
      // time and state/alarm axes supply their own tick and sizing policies.
      scales: chartAxes(axes, onYAxisWidth),
    },
  };
}
