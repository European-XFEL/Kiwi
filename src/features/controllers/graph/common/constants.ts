export type Range = [number, number];

export const TRACE_COLORS = [
  '#3399ff',
  '#ff3333',
  '#33a02c',
  '#a6cee3',
  '#6a3d9a',
  '#ffff00',
  '#fb9a99',
  '#b15928',
  '#ff7f00',
  '#b2df8a',
  '#cab2d6',
  '#000000',
];
export const SCATTER_BLUE = `rgba(51, 153, 255, ${200 / 255})`;
export const SCATTER_RED = `rgba(255, 51, 51, ${200 / 255})`;
export const BAR_BLUE = `rgba(51, 153, 255, ${180 / 255})`;
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
} as const;
export const GRAPH_TICK_DENSITY = {
  density: 1,
  minimum: 2.25,
  referenceLength: 300,
} as const;
export const GRAPH_COLORS = {
  plotBackground: '#fff',
  frame: '#000',
  grid: '#ddd',
} as const;
