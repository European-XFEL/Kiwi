import type { Data, PlotData } from 'plotly.js';

export type ChartType = 'line' | 'points' | 'area' | 'bar' | 'heatmap';

export type XYSeries = {
  x: (number | string | Date)[] | Float64Array;
  y: number[] | Float64Array;
};

export interface HeatmapSeries {
  xLabels: string[]; // e.g., time bins as "12:01", "12:02", ...
  yLabels: string[]; // e.g., value bin labels
  z: number[][]; // counts/intensity
}

export type TraceInput =
  | { kind: 'xy'; series: XYSeries; name?: string }
  | { kind: 'heatmap'; series: HeatmapSeries; name?: string };

export const buildLine = (
  input: Extract<TraceInput, { kind: 'xy' }>
): Partial<PlotData> => ({
  x: input.series.x,
  y: input.series.y,
  type: 'scatter',
  mode: 'lines+markers',
  name: input.name ?? 'Series',
});

export const buildPoints = (
  input: Extract<TraceInput, { kind: 'xy' }>
): Data => ({
  x: input.series.x,
  y: input.series.y,
  type: 'scatter',
  mode: 'markers',
  name: input.name ?? 'Series',
  marker: { size: 5 },
});

export const buildArea = (
  input: Extract<TraceInput, { kind: 'xy' }>
): Data => ({
  x: input.series.x,
  y: input.series.y,
  type: 'scatter',
  mode: 'lines',
  fill: 'tozeroy', // area to y=0
  name: input.name ?? 'Series',
});

export const buildBar = (input: Extract<TraceInput, { kind: 'xy' }>): Data => ({
  x: input.series.x,
  y: input.series.y,
  type: 'bar',
  name: input.name ?? 'Series',
});

export const buildHeatmap = (
  input: Extract<TraceInput, { kind: 'heatmap' }>
): Data => ({
  x: input.series.xLabels,
  y: input.series.yLabels,
  z: input.series.z,
  type: 'heatmap',
  hoverongaps: false,
  name: input.name ?? 'Density',
});

export const TraceFactory: Record<ChartType, (input: TraceInput) => Data> = {
  line: (i) => (i.kind === 'xy' ? buildLine(i) : buildHeatmap(i as any)),
  points: (i) => (i.kind === 'xy' ? buildPoints(i) : buildHeatmap(i as any)),
  area: (i) => (i.kind === 'xy' ? buildArea(i) : buildHeatmap(i as any)),
  bar: (i) => (i.kind === 'xy' ? buildBar(i) : buildHeatmap(i as any)),
  heatmap: (i) => buildHeatmap(i as any),
};
