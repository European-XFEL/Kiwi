import React from 'react';
import type { EChartsType } from 'echarts/core';
import type { Range } from './trendChartConfig';

type Point = { x: number; y: number };
type PlotBounds = { left: number; right: number; top: number; bottom: number };
export type AxisRanges = { x: Range; y: Range };

const PRIMARY_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;
const RIGHT_MOUSE_BUTTON = 2;
const RIGHT_DRAG_ZOOM_PIXELS = 100;

/** Keeps selection edges inside the plot so a drag ending outside still has valid ranges. */
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Finds the rendered grid rectangle that accepts pan and zoom gestures. */
function plotBounds(chart: EChartsType, ranges: AxisRanges): PlotBounds {
  // ECharts owns the final grid geometry. Derive it from the rendered axes so
  // gestures still match the plot after title, inversion, or layout changes.
  const first = chart.convertToPixel({ gridIndex: 0 }, [
    ranges.x[0],
    ranges.y[0],
  ]);
  const second = chart.convertToPixel({ gridIndex: 0 }, [
    ranges.x[1],
    ranges.y[1],
  ]);
  return {
    left: Math.min(first[0], second[0]),
    right: Math.max(first[0], second[0]),
    top: Math.min(first[1], second[1]),
    bottom: Math.max(first[1], second[1]),
  };
}

/** Maps a pixel on one axis to its value, including logarithmic interpolation. */
function axisValue(
  pixel: number,
  pixelAtMin: number,
  pixelAtMax: number,
  range: Range,
  logarithmic: boolean
) {
  // A logarithmic axis is evenly spaced in log space, not value space.
  const ratio = (pixel - pixelAtMin) / (pixelAtMax - pixelAtMin);
  if (!logarithmic) return range[0] + ratio * (range[1] - range[0]);
  const min = Math.log(range[0]);
  return Math.exp(min + ratio * (Math.log(range[1]) - min));
}

/** Moves a visible range by the drag distance without changing its span. */
function shiftedRange(
  range: Range,
  startPixel: number,
  currentPixel: number,
  pixelAtMin: number,
  pixelAtMax: number,
  logarithmic: boolean
): Range {
  // A linear offset would make logarithmic panning change the visible ratio.
  if (logarithmic) {
    const start = Math.log(
      axisValue(startPixel, pixelAtMin, pixelAtMax, range, true)
    );
    const current = Math.log(
      axisValue(currentPixel, pixelAtMin, pixelAtMax, range, true)
    );
    const shift = start - current;
    return [
      Math.exp(Math.log(range[0]) + shift),
      Math.exp(Math.log(range[1]) + shift),
    ];
  }
  const shift =
    axisValue(startPixel, pixelAtMin, pixelAtMax, range, false) -
    axisValue(currentPixel, pixelAtMin, pixelAtMax, range, false);
  return [range[0] + shift, range[1] + shift];
}

/** Recenters a visible range on a fixed pixel, then scales it for a drag zoom. */
function scaledRange(
  range: Range,
  centerPixel: number,
  pixelAtMin: number,
  pixelAtMax: number,
  logarithmic: boolean,
  scale: number
): Range {
  // A zoom should make the clicked point the view center, rather than leave it
  // at its old relative position. This is how a wheel zoom around a point feels.
  const center = axisValue(
    centerPixel,
    pixelAtMin,
    pixelAtMax,
    range,
    logarithmic
  );
  if (!logarithmic) {
    const halfSpan = ((range[1] - range[0]) * scale) / 2;
    return [center - halfSpan, center + halfSpan];
  }
  const logarithmicCenter = Math.log(center);
  const logarithmicHalfSpan =
    ((Math.log(range[1]) - Math.log(range[0])) * scale) / 2;
  return [
    Math.exp(logarithmicCenter - logarithmicHalfSpan),
    Math.exp(logarithmicCenter + logarithmicHalfSpan),
  ];
}

/** Converts document mouse coordinates to coordinates relative to the chart container. */
function mousePosition(container: HTMLElement, event: MouseEvent): Point {
  const rect = container.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

/** Shares the clamped rectangle between the zoom preview and the committed selection. */
function selectionBounds(
  start: Point,
  end: Point,
  bounds: PlotBounds
): PlotBounds {
  const x0 = clamp(start.x, bounds.left, bounds.right);
  const x1 = clamp(end.x, bounds.left, bounds.right);
  const y0 = clamp(start.y, bounds.top, bounds.bottom);
  const y1 = clamp(end.y, bounds.top, bounds.bottom);
  return {
    left: Math.min(x0, x1),
    right: Math.max(x0, x1),
    top: Math.min(y0, y1),
    bottom: Math.max(y0, y1),
  };
}

/** Draws the bounded rectangle that previews primary-button Zoom before release. */
function setSelection(
  element: HTMLDivElement | null,
  start: Point,
  end: Point,
  bounds: PlotBounds
) {
  if (!element) return;
  const { left, right, top, bottom } = selectionBounds(start, end, bounds);
  Object.assign(element.style, {
    display: 'block',
    left: `${left}px`,
    top: `${top}px`,
    width: `${right - left}px`,
    height: `${bottom - top}px`,
  });
}

/**
 * Connects the toolbar and mouse shortcuts to chart ranges.
 *
 * Zoom is a primary-button rectangle, Move is a primary-button pan, middle-button
 * dragging always pans, and right-button horizontal dragging continuously zooms.
 */
export function useTrendMouseGestures({
  containerRef,
  selectionRef,
  chartRef,
  tool,
  inverted,
  logarithmicY,
  activeRef,
  getRanges,
  setRanges,
  complete,
  finish,
  reset,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectionRef: React.RefObject<HTMLDivElement | null>;
  chartRef: React.RefObject<EChartsType | null>;
  tool: 'pointer' | 'zoom' | 'pan';
  inverted: { x: boolean; y: boolean };
  logarithmicY: boolean;
  activeRef: React.RefObject<boolean>;
  getRanges: () => AxisRanges | undefined;
  setRanges: (ranges: AxisRanges) => void;
  complete: (xRange: Range, yRange: Range) => void;
  finish: () => void;
  reset: () => void;
}) {
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const chart = chartRef.current;
    if (!container || !chart) return;

    let gesture:
      | {
          start: Point;
          ranges: AxisRanges;
          bounds: PlotBounds;
          pixels: AxisRanges;
          tool: 'zoom' | 'pan' | 'scale';
          button: number;
        }
      | undefined;
    // The preview only belongs to rectangle zoom and must disappear after every outcome.
    const hideSelection = () => {
      if (selectionRef.current) selectionRef.current.style.display = 'none';
    };
    // Escape, blur, and unmount restore the captured range instead of leaving a half-pan.
    const cancel = () => {
      if (!gesture) return;
      const { ranges } = gesture;
      gesture = undefined;
      hideSelection();
      activeRef.current = false;
      setRanges(ranges);
      finish();
    };
    // Movement and release use the same pan calculation, including logarithmic Y.
    const shiftedRanges = (
      ranges: AxisRanges,
      pixels: AxisRanges,
      start: Point,
      current: Point
    ): AxisRanges => ({
      x: shiftedRange(ranges.x, start.x, current.x, ...pixels.x, false),
      y: shiftedRange(ranges.y, start.y, current.y, ...pixels.y, logarithmicY),
    });
    // Both axes scale together so right-drag behaves like a conventional chart zoom.
    const scaledRanges = (
      ranges: AxisRanges,
      pixels: AxisRanges,
      start: Point,
      current: Point
    ) => {
      // Keep the data point under the initial cursor position fixed. Exponential
      // scaling makes equal horizontal drags feel consistent at every zoom level.
      const scale = Math.exp((current.x - start.x) / RIGHT_DRAG_ZOOM_PIXELS);
      return {
        x: scaledRange(ranges.x, start.x, ...pixels.x, false, scale),
        y: scaledRange(ranges.y, start.y, ...pixels.y, logarithmicY, scale),
      };
    };
    // Apply temporary ranges while dragging to give immediate feedback before committing.
    const onMouseMove = (event: MouseEvent) => {
      if (!gesture) return;
      const current = mousePosition(container, event);
      const { ranges, pixels, start, bounds } = gesture;
      if (gesture.tool === 'zoom') {
        setSelection(selectionRef.current, start, current, bounds);
      } else if (gesture.tool === 'pan') {
        setRanges(shiftedRanges(ranges, pixels, start, current));
      } else {
        setRanges(scaledRanges(ranges, pixels, start, current));
      }
      event.preventDefault();
    };
    // Commit the final range once, which pauses following only after the user finishes.
    const onMouseUp = (event: MouseEvent) => {
      if (!gesture || event.button !== gesture.button) return;
      const current = mousePosition(container, event);
      const { start, ranges, bounds, pixels, tool: gestureTool } = gesture;
      gesture = undefined;
      hideSelection();
      activeRef.current = false;

      // A middle click shares the toolbar's reset behavior. A small movement
      // still counts as a click, so releasing a steady mouse cannot pan by accident.
      if (
        event.button === MIDDLE_MOUSE_BUTTON &&
        Math.hypot(current.x - start.x, current.y - start.y) < 3
      ) {
        reset();
        event.preventDefault();
        return;
      }
      let next = ranges;
      if (gestureTool === 'pan') {
        next = shiftedRanges(ranges, pixels, start, current);
      } else if (gestureTool === 'scale') {
        next = scaledRanges(ranges, pixels, start, current);
      } else {
        const { left, right, top, bottom } = selectionBounds(
          start,
          current,
          bounds
        );
        if (right - left < 1 || bottom - top < 1) {
          setRanges(ranges);
          finish();
          return;
        }
        const xValues = [
          axisValue(left, ...pixels.x, ranges.x, false),
          axisValue(right, ...pixels.x, ranges.x, false),
        ].sort((a, b) => a - b) as Range;
        const yValues = [
          axisValue(top, ...pixels.y, ranges.y, logarithmicY),
          axisValue(bottom, ...pixels.y, ranges.y, logarithmicY),
        ].sort((a, b) => a - b) as Range;
        next = { x: xValues, y: yValues };
      }
      setRanges(next);
      complete(next.x, next.y);
      finish();
      event.preventDefault();
    };
    // Capture a stable range and grid rectangle so one gesture is not affected by live updates.
    const onMouseDown = (event: MouseEvent) => {
      if (
        event.button !== PRIMARY_MOUSE_BUTTON &&
        event.button !== MIDDLE_MOUSE_BUTTON &&
        event.button !== RIGHT_MOUSE_BUTTON
      )
        return;
      if (tool === 'pointer' && event.button === PRIMARY_MOUSE_BUTTON) return;
      const ranges = getRanges();
      if (!ranges) return;
      const start = mousePosition(container, event);
      const bounds = plotBounds(chart, ranges);
      if (
        start.x < bounds.left ||
        start.x > bounds.right ||
        start.y < bounds.top ||
        start.y > bounds.bottom
      )
        return;
      // The toolbar controls primary-button dragging. The two shortcuts remain
      // available in every mode: middle-button drag pans, right-button drag
      // scales both axes around the cursor (left zooms in, right zooms out).
      const gestureTool =
        event.button === MIDDLE_MOUSE_BUTTON
          ? 'pan'
          : event.button === RIGHT_MOUSE_BUTTON
            ? 'scale'
            : tool === 'pan'
              ? 'pan'
              : 'zoom';
      gesture = {
        start,
        ranges,
        bounds,
        // Store endpoints in data-min/data-max order so every gesture handles
        // inversion identically, using the geometry captured before any movement.
        pixels: {
          x: inverted.x
            ? [bounds.right, bounds.left]
            : [bounds.left, bounds.right],
          y: inverted.y
            ? [bounds.top, bounds.bottom]
            : [bounds.bottom, bounds.top],
        },
        tool: gestureTool,
        button: event.button,
      };
      activeRef.current = true;
      if (gestureTool === 'zoom')
        setSelection(selectionRef.current, start, start, bounds);
      event.preventDefault();
    };
    // Escape is the keyboard equivalent of abandoning an unfinished drag.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    // Right-button dragging is a chart gesture, so it must not open a browser menu.
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    container.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    container.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', cancel);
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', cancel);
      cancel();
    };
  }, [
    activeRef,
    chartRef,
    complete,
    containerRef,
    finish,
    getRanges,
    inverted.x,
    inverted.y,
    logarithmicY,
    selectionRef,
    setRanges,
    tool,
    reset,
  ]);
}
