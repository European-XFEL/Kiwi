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
  // Reserve room for signed compact labels before the first data update.
  yAxisSize: { titled: 80, untitled: 64 },
  lineWidth: 1.5,
  trendPointSize: 2.5,
  vectorPointSize: 2,
} as const;
export const GRAPH_COLORS = {
  plotBackground: '#fff',
  frame: '#000',
  grid: '#ddd',
} as const;
