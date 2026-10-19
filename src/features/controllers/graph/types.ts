export type Range = [number, number];
export type AxisRanges = { x: Range; y: Range };
export type PlotBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
export type PlotViewport = {
  readBounds: () => PlotBounds | undefined;
  readRanges: (fallback?: AxisRanges) => AxisRanges | undefined;
  setRanges: (ranges: AxisRanges) => void;
};
export type MouseTool = 'pointer' | 'zoom' | 'pan';
