/**
 * Plot Utilities - Public API
 *
 * Utilities for plot/graph processing and downsampling.
 */

// LTTB downsampling
export { lttb, lttbWithPositions, downsampleArray, type XYPoint } from './lttb';

// Trace factory for Plotly
export { TraceFactory } from './traceFactory';
export type { ChartType } from './traceFactory';

// Heatmap binning
export { buildTimeValueHeatmap } from './heatmapBining';
