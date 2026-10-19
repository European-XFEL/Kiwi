import React from 'react';
import type { AxisRanges, PlotBounds, PlotViewport, Range } from './types';
export type { AxisRanges, PlotBounds } from './types';

type Point = { x: number; y: number };
const PRIMARY_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;
const RIGHT_MOUSE_BUTTON = 2;
// Match pyqtgraph: each viewport pixel changes the axis span by 2%.
export const ZOOM_FACTOR_PER_PIXEL = 1.02;
// Allow small mouse jitter when distinguishing a middle click from a pan.
const MIDDLE_CLICK_TOLERANCE_PIXELS = 3;
const MIN_SELECTION_SIZE_PIXELS = 1;

/** Keeps selection edges inside the plot so a drag ending outside still has valid ranges. */
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
  if (!logarithmic) {
    return range[0] + ratio * (range[1] - range[0]);
  }
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

/** Scales a visible range around the data value at the initial clicked pixel. */
export function scaledRange(
  range: Range,
  anchorPixel: number,
  pixelAtMin: number,
  pixelAtMax: number,
  logarithmic: boolean,
  scale: number
): Range {
  // No movement on this axis: preserve its exact range, avoiding log rounding.
  if (scale === 1) {
    return range;
  }
  // Work with data values for linear axes and their logarithms for log axes.
  // Scaling log distances changes visible ratios rather than value differences.
  const min = logarithmic ? Math.log(range[0]) : range[0];
  const max = logarithmic ? Math.log(range[1]) : range[1];
  // Find the pressed point's fraction along the axis, then its axis value.
  // Pixel endpoints are ordered by data min/max, including inverted axes.
  const ratio = (anchorPixel - pixelAtMin) / (pixelAtMax - pixelAtMin);
  const anchor = min + ratio * (max - min);
  // Multiply each endpoint's distance from the anchor. A factor below 1 shrinks
  // the span (zoom in); above 1 expands it (zoom out). The anchor keeps the same
  // relative position on screen. E.g. [0, 100], anchor 25, scale 0.5 -> [12.5, 62.5].
  const scaledMin = anchor + (min - anchor) * scale;
  const scaledMax = anchor + (max - anchor) * scale;
  // Convert logarithmic coordinates back to data values before applying ranges.
  const scaled: Range = logarithmic
    ? [Math.exp(scaledMin), Math.exp(scaledMax)]
    : [scaledMin, scaledMax];
  // Long drags can overflow or collapse endpoints to the same floating-point value.
  // Keep this axis usable while allowing the other axis to zoom independently.
  return scaled.every(Number.isFinite) &&
    Number.isFinite(scaled[1] - scaled[0]) &&
    scaled[0] < scaled[1] &&
    (!logarithmic || scaled[0] > 0)
    ? scaled
    : range;
}

/** Converts viewport coordinates to unscaled chart pixels, including scene CSS scaling. */
function mousePosition(container: HTMLElement, event: MouseEvent): Point {
  // container is containerRef.current: the graph's HTML div holding the
  // Chart.js canvas. Its bounding rectangle includes the parent scene's CSS
  // scale; offsetWidth/offsetHeight are its unscaled layout dimensions, used
  // by chart bounds and the zoom box.
  const rect = container.getBoundingClientRect();
  // Convert displayed pixels back to chart pixels. For example, at 200% scene
  // scale, a 100px mouse movement covers 50 chart pixels. Fall back to 1 when
  // dimensions are unavailable (e.g. a hidden container).
  const scaleX =
    rect.width > 0 && container.offsetWidth > 0
      ? container.offsetWidth / rect.width
      : 1;
  const scaleY =
    rect.height > 0 && container.offsetHeight > 0
      ? container.offsetHeight / rect.height
      : 1;
  return {
    // clientX/clientY and rect.left/top share viewport coordinates. Subtract
    // the graph's current position before applying the inverse scene scale.
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
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
  if (!element) {
    return;
  }
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
 * Attaches mouse and keyboard listeners and turns gestures into range changes.
 * Reads and writes ranges through callbacks supplied by useChart.
 *
 * Zoom is a primary-button rectangle, Move is a primary-button pan, middle-button
 * dragging always pans, and right-button dragging independently zooms each axis.
 * A middle click resets the view; Escape or window blur cancels an active drag.
 *
 * Configuration properties:
 * - `containerRef`: Chart container used to attach mouse listeners and convert
 *   browser coordinates to unscaled chart pixels, including scene CSS scaling.
 * - `selectionRef`: Overlay div used to preview a rectangle zoom. The preview
 *   is hidden when the gesture ends or is cancelled.
 * - `viewport`: Provides plot geometry through `readBounds()`. Bounds are in
 *   unscaled chart pixels and constrain where gestures start and zoom selections.
 * - `tool`: Controls primary-button input: `pointer` ignores it, `zoom` selects
 *   a rectangle, and `pan` translates the view. Middle/right shortcuts remain
 *   available in every mode.
 * - `inverted`: X/Y flags that reverse the mapping between axis data values and
 *   chart pixel endpoints to match the displayed axis directions.
 * - `logarithmicX`: Uses logarithmic coordinates for X pan, zoom, and selection
 *   calculations. Defaults to false; logarithmic ranges must be positive.
 * - `logarithmicY`: Uses logarithmic coordinates for Y pan, zoom, and selection
 *   calculations. Logarithmic ranges must be positive.
 * - `activeRef`: Shared flag set on an accepted mouse press and cleared on
 *   release or cancellation. Lets `useChart` defer data updates during a drag.
 * - `getRanges`: Reads the current X/Y data ranges, captured at mouse-down so
 *   calculations stay relative to the initial view. Undefined prevents a gesture.
 * - `setRanges`: Updates the displayed ranges and the caller's range reference
 *   for live previews, final results, and restoration after cancellation.
 * - `complete`: Commits the final X/Y data ranges on release so the caller can
 *   preserve the selected view or pause live following.
 * - `finish`: Runs after gesture completion or cancellation. `useChart` uses
 *   this callback to publish data updates deferred while the gesture was active.
 * - `reset`: Restores the caller's default view on middle-click, using the same
 *   reset behavior as the toolbar.
 * - `resetRevision`: Counter changed by the caller when resetting the view.
 *   Changing it triggers effect cleanup, cancelling an active gesture and queued
 *   preview frames even when the reset callback itself has not changed.
 */
export function useMouseGestures({
  containerRef,
  selectionRef,
  viewport,
  tool,
  inverted,
  logarithmicX = false,
  logarithmicY,
  lockZoom = false,
  activeRef,
  getRanges,
  setRanges,
  complete,
  finish,
  reset,
  resetRevision,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectionRef: React.RefObject<HTMLDivElement | null>;
  viewport: PlotViewport;
  tool: 'pointer' | 'zoom' | 'pan';
  inverted: { x: boolean; y: boolean };
  logarithmicX?: boolean;
  logarithmicY: boolean;
  /** Scale both axes together for image views with a locked aspect ratio. */
  lockZoom?: boolean;
  activeRef: React.RefObject<boolean>;
  getRanges: () => AxisRanges | undefined;
  setRanges: (ranges: AxisRanges) => void;
  complete: (xRange: Range, yRange: Range) => void;
  finish: () => void;
  reset: () => void;
  resetRevision: number;
}) {
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let gesture:
      | {
          // Mouse-down position relative to the container, in unscaled chart pixels.
          start: Point;
          // Mouse-down clientX/clientY in browser viewport pixels. These raw
          // coordinates keep zoom sensitivity independent of scene CSS scaling.
          startClientPosition: Point;
          ranges: AxisRanges;
          bounds: PlotBounds;
          axisPixels: AxisRanges;
          tool: 'zoom' | 'pan' | 'scale';
          button: number;
          dragged: boolean;
        }
      | undefined;
    let zoomAxis: 'x' | 'y' | undefined;
    let frame: number | undefined;
    let pendingRanges: AxisRanges | undefined;
    const cancelFrame = () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      frame = undefined;
      pendingRanges = undefined;
    };
    const scheduleRanges = (ranges: AxisRanges) => {
      pendingRanges = ranges;
      if (frame !== undefined) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = undefined;
        const next = pendingRanges;
        pendingRanges = undefined;
        if (next) {
          setRanges(next);
        }
      });
    };
    // The preview only belongs to rectangle zoom and must disappear after every outcome.
    const hideSelection = () => {
      if (selectionRef.current) {
        selectionRef.current.style.display = 'none';
      }
    };
    // Escape, blur, and unmount restore the captured range instead of leaving a half-pan.
    const cancel = () => {
      cancelFrame();
      if (!gesture) {
        return;
      }
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
      axisPixels: AxisRanges,
      start: Point,
      current: Point
    ): AxisRanges => ({
      x: shiftedRange(
        ranges.x,
        start.x,
        current.x,
        ...axisPixels.x,
        logarithmicX
      ),
      y: shiftedRange(
        ranges.y,
        start.y,
        current.y,
        ...axisPixels.y,
        logarithmicY
      ),
    });
    // Map the anchor in chart pixels; measure drag distance in browser viewport
    // pixels so scene CSS scaling does not change how sensitive the zoom feels.
    const scaledRanges = (
      ranges: AxisRanges,
      axisPixels: AxisRanges,
      start: Point,
      startClientPosition: Point,
      event: MouseEvent
    ) => {
      // Measure total movement from the original press and scale the captured
      // starting ranges, rather than repeatedly scaling the previous preview.
      // Exponential factors give equal drags the same proportional span change
      // at every zoom level. Horizontal and vertical movement act independently.
      // Negative X exponent: dragging right shrinks X (zoom in).
      let scaleX =
        ZOOM_FACTOR_PER_PIXEL ** -(event.clientX - startClientPosition.x);
      // clientY grows downward: down expands Y (zoom out), up shrinks it.
      let scaleY =
        ZOOM_FACTOR_PER_PIXEL ** (event.clientY - startClientPosition.y);
      if (lockZoom) {
        const dx = event.clientX - startClientPosition.x;
        const dy = event.clientY - startClientPosition.y;
        if (!zoomAxis) {
          if (Math.hypot(dx, dy) < MIDDLE_CLICK_TOLERANCE_PIXELS) {
            return ranges;
          }
          // Hold the first deliberate direction for this gesture. Combining
          // opposing axis directions cancels diagonal drags; switching axes
          // mid-drag abruptly reverses the zoom near the diagonal.
          zoomAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        }
        const displacement = zoomAxis === 'x' ? -dx : dy;
        const scale = ZOOM_FACTOR_PER_PIXEL ** displacement;
        scaleX = scale;
        scaleY = scale;
      }
      return {
        x: scaledRange(
          ranges.x,
          start.x,
          ...axisPixels.x,
          logarithmicX,
          scaleX
        ),
        y: scaledRange(
          ranges.y,
          start.y,
          ...axisPixels.y,
          logarithmicY,
          scaleY
        ),
      };
    };
    // Apply temporary ranges while dragging to give immediate feedback before committing.
    const onMouseMove = (event: MouseEvent) => {
      if (!gesture) {
        return;
      }
      const current = mousePosition(container, event);
      const { ranges, axisPixels, start, startClientPosition, bounds } =
        gesture;
      if (
        Math.hypot(current.x - start.x, current.y - start.y) >=
        MIDDLE_CLICK_TOLERANCE_PIXELS
      ) {
        gesture.dragged = true;
      }
      if (gesture.tool === 'zoom') {
        setSelection(selectionRef.current, start, current, bounds);
      } else if (gesture.tool === 'pan') {
        scheduleRanges(shiftedRanges(ranges, axisPixels, start, current));
      } else {
        scheduleRanges(
          scaledRanges(ranges, axisPixels, start, startClientPosition, event)
        );
      }
      event.preventDefault();
    };
    // Commit the final range once, which pauses following only after the user finishes.
    const onMouseUp = (event: MouseEvent) => {
      if (!gesture || event.button !== gesture.button) {
        return;
      }
      cancelFrame();
      const current = mousePosition(container, event);
      const {
        start,
        startClientPosition,
        ranges,
        bounds,
        axisPixels,
        dragged,
        tool: gestureTool,
      } = gesture;
      gesture = undefined;
      hideSelection();
      activeRef.current = false;

      // A middle click shares the toolbar's reset behavior. A small movement
      // still counts as a click, so releasing a steady mouse cannot pan by accident.
      if (
        event.button === MIDDLE_MOUSE_BUTTON &&
        !dragged &&
        Math.hypot(current.x - start.x, current.y - start.y) <
          MIDDLE_CLICK_TOLERANCE_PIXELS
      ) {
        reset();
        event.preventDefault();
        return;
      }
      let next = ranges;
      if (gestureTool === 'pan') {
        next = shiftedRanges(ranges, axisPixels, start, current);
      } else if (gestureTool === 'scale') {
        next = scaledRanges(
          ranges,
          axisPixels,
          start,
          startClientPosition,
          event
        );
      } else {
        const { left, right, top, bottom } = selectionBounds(
          start,
          current,
          bounds
        );
        if (
          right - left < MIN_SELECTION_SIZE_PIXELS ||
          bottom - top < MIN_SELECTION_SIZE_PIXELS
        ) {
          setRanges(ranges);
          finish();
          return;
        }
        const xValues = [
          axisValue(left, ...axisPixels.x, ranges.x, logarithmicX),
          axisValue(right, ...axisPixels.x, ranges.x, logarithmicX),
        ].sort((a, b) => a - b) as Range;
        const yValues = [
          axisValue(top, ...axisPixels.y, ranges.y, logarithmicY),
          axisValue(bottom, ...axisPixels.y, ranges.y, logarithmicY),
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
      const bounds = viewport.readBounds();
      if (!bounds) {
        return;
      }
      if (
        event.button !== PRIMARY_MOUSE_BUTTON &&
        event.button !== MIDDLE_MOUSE_BUTTON &&
        event.button !== RIGHT_MOUSE_BUTTON
      ) {
        return;
      }
      if (tool === 'pointer' && event.button === PRIMARY_MOUSE_BUTTON) {
        return;
      }
      const ranges = getRanges();
      if (!ranges) {
        return;
      }
      const start = mousePosition(container, event);
      if (
        start.x < bounds.left ||
        start.x > bounds.right ||
        start.y < bounds.top ||
        start.y > bounds.bottom
      ) {
        return;
      }
      // The toolbar controls primary-button dragging. The two shortcuts remain
      // available in every mode: middle-button drag pans, right-button drag
      // scales around the clicked point (right zooms X in, up zooms Y in).
      const gestureTool =
        event.button === MIDDLE_MOUSE_BUTTON
          ? 'pan'
          : event.button === RIGHT_MOUSE_BUTTON
            ? 'scale'
            : tool === 'pan'
              ? 'pan'
              : 'zoom';
      zoomAxis = undefined;
      gesture = {
        start,
        startClientPosition: { x: event.clientX, y: event.clientY },
        ranges,
        bounds,
        // Store endpoints in data-min/data-max order so every gesture handles
        // inversion identically, using the geometry captured before any movement.
        axisPixels: {
          x: inverted.x
            ? [bounds.right, bounds.left]
            : [bounds.left, bounds.right],
          y: inverted.y
            ? [bounds.top, bounds.bottom]
            : [bounds.bottom, bounds.top],
        },
        tool: gestureTool,
        button: event.button,
        dragged: false,
      };
      activeRef.current = true;
      if (gestureTool === 'zoom') {
        setSelection(selectionRef.current, start, start, bounds);
      }
      event.preventDefault();
    };
    // Escape is the keyboard equivalent of abandoning an unfinished drag.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancel();
      }
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
    viewport,
    complete,
    containerRef,
    finish,
    getRanges,
    inverted.x,
    inverted.y,
    logarithmicX,
    logarithmicY,
    lockZoom,
    selectionRef,
    setRanges,
    tool,
    reset,
    resetRevision,
  ]);
}
