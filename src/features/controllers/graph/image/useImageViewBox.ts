import { type PlotSettings } from '@/karabo/common/api';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';

import { scaledRange, useMouseGestures } from '../useMouseGestures';
import type { AxisRanges, MouseTool, PlotViewport, PlotBounds } from '../types';
import { imageBounds } from './decorations';
import type { ImageSize, ImageSource } from './raster';

export type ImageView = {
  size: ImageSize;
  bounds: PlotBounds;
  ranges: AxisRanges;
};

const finishGesture = () => {};
const completeGesture = () => {};
const WHEEL_ZOOM_SENSITIVITY = 0.002;

function lockAspect(
  ranges: AxisRanges,
  size: ImageSize,
  plotConfig: PlotSettings
): AxisRanges {
  if (plotConfig.aspect_ratio === 0 || size.width <= 0 || size.height <= 0) {
    return ranges;
  }
  let ratio = size.width / size.height;
  // Mode 1 keeps source pixels square; mode 2 keeps calibrated axis units square.
  if (
    plotConfig.aspect_ratio === 2 &&
    plotConfig.x_scale !== 0 &&
    plotConfig.y_scale !== 0
  ) {
    ratio *= Math.abs(plotConfig.y_scale / plotConfig.x_scale);
  }
  const width = ranges.x[1] - ranges.x[0];
  const height = ranges.y[1] - ranges.y[0];
  // Expand around the center without cropping any of the requested range.
  const nextWidth = Math.max(width, height * ratio);
  const nextHeight = Math.max(height, width / ratio);
  const x = (ranges.x[0] + ranges.x[1]) / 2;
  const y = (ranges.y[0] + ranges.y[1]) / 2;
  return {
    x: [x - nextWidth / 2, x + nextWidth / 2],
    y: [y - nextHeight / 2, y + nextHeight / 2],
  };
}

/** Calculate pointer-anchored ranges in local pixels, including scene CSS scaling. */
function wheelZoomRanges({
  event,
  rect,
  size,
  bounds,
  ranges,
}: {
  event: WheelEvent;
  rect: DOMRect;
  size: ImageSize;
  bounds: PlotBounds;
  ranges: AxisRanges;
}): AxisRanges | undefined {
  // Mouse coordinates include CSS scaling; convert back to the measured viewport size.
  const x =
    (event.clientX - rect.left) *
    (rect.width > 0 ? size.width / rect.width : 1);
  const y =
    (event.clientY - rect.top) *
    (rect.height > 0 ? size.height / rect.height : 1);
  if (
    x < bounds.left ||
    x > bounds.right ||
    y < bounds.top ||
    y > bounds.bottom
  ) {
    return;
  }
  let delta = event.deltaY;
  // Normalize line/page wheel events before applying the pixel-based zoom sensitivity.
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    delta *= 16;
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    delta *= size.height;
  }
  // Exponential scaling keeps zoom factors positive; cap unusually large wheel deltas.
  const factor = Math.exp(
    Math.max(-2, Math.min(2, delta * WHEEL_ZOOM_SENSITIVITY))
  );
  // Image coordinates increase rightward and downward; min Y maps to the top edge.
  // Share pointer anchoring and invalid-range protection with drag zoom.
  return {
    x: scaledRange(ranges.x, x, bounds.left, bounds.right, false, factor),
    y: scaledRange(ranges.y, y, bounds.top, bounds.bottom, false, factor),
  };
}

/** Owns image geometry and navigation, independently of the renderer. */
export function useImageViewBox({
  containerRef,
  source,
  plotConfig,
  imageOnly,
  identity,
  requestDraw,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  source: Pick<ImageSource, 'width' | 'height' | 'color'> | undefined;
  plotConfig: PlotSettings;
  imageOnly: boolean;
  identity: unknown;
  requestDraw: () => void;
}) {
  // DOM rectangle used by the shared gestures to preview a zoom selection.
  const selectionRef = useRef<HTMLDivElement>(null);
  // Selected primary-button behavior, also displayed by the toolbar.
  const [tool, selectTool] = useState<MouseTool>('pointer');
  // Reset generation observed by the gesture hook to cancel an active drag.
  const [resetRevision, setResetRevision] = useState(0);
  // Shared drag flag prevents wheel zoom from changing ranges during another gesture.
  const activeRef = useRef(false);
  // Current source-pixel ranges, updated synchronously during navigation.
  const rangesRef = useRef<AxisRanges | undefined>(undefined);
  // Unscaled layout dimensions supplied by ResizeObserver for drawing and pointer conversion.
  const sizeRef = useRef<ImageSize>({ width: 0, height: 0 });
  // Defer fitting the full source until readView has usable viewport dimensions.
  const needsReset = useRef(true);
  // Latest committed inputs read by stable callbacks without capturing stale settings.
  const inputRef = useRef({ source, plotConfig, imageOnly });
  // Previous binding identity and dimensions, used to detect navigation-invalidating changes.
  const identityRef = useRef<
    { identity: unknown; width: number; height: number } | undefined
  >(undefined);

  // Stable gesture callbacks read committed inputs without reattaching on every frame.
  useLayoutEffect(() => {
    inputRef.current = { source, plotConfig, imageOnly };
  });

  // Derive plot bounds from the latest viewport size, encoding, and webcam mode.
  const readBounds = useCallback(() => {
    const { source, imageOnly } = inputRef.current;
    return imageBounds(sizeRef.current, source?.color ?? false, imageOnly);
  }, []);

  // Resolve pending resets and aspect locking into the geometry consumed by the renderer.
  const readView = useCallback((): ImageView => {
    const { source, plotConfig, imageOnly } = inputRef.current;
    const size = sizeRef.current;
    const bounds = readBounds();
    let ranges = rangesRef.current;
    // Ranges are source-pixel coordinates. Webcam views always fit the complete source.
    if (!ranges || needsReset.current || imageOnly) {
      ranges = { x: [0, source?.width || 1], y: [0, source?.height || 1] };
    }
    const plotSize = {
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
    };
    if (
      size.width > 0 &&
      size.height > 0 &&
      plotSize.width > 0 &&
      plotSize.height > 0
    ) {
      ranges = lockAspect(ranges, plotSize, plotConfig);
      rangesRef.current = ranges;
      // Resolve resets when drawing reads the view, after gesture cleanup restores its range.
      needsReset.current = false;
    }
    return { size, bounds, ranges };
  }, [readBounds]);

  // Provide stable navigation methods that read current geometry and redraw range changes.
  const viewport = useMemo<PlotViewport>(
    () => ({
      readBounds: () => {
        // An absent interaction area disables navigation for image-only webcams.
        if (inputRef.current.imageOnly) {
          return undefined;
        }
        const bounds = readBounds();
        return bounds.right > bounds.left && bounds.bottom > bounds.top
          ? bounds
          : undefined;
      },
      readRanges: () => rangesRef.current,
      setRanges: (ranges) => {
        const bounds = readBounds();
        rangesRef.current = lockAspect(
          ranges,
          {
            width: bounds.right - bounds.left,
            height: bounds.bottom - bounds.top,
          },
          inputRef.current.plotConfig
        );
        requestDraw();
      },
    }),
    [readBounds, requestDraw]
  );
  // Request a full-source fit, cancel any active gesture, and schedule a redraw.
  const reset = useCallback(() => {
    needsReset.current = true;
    // Advancing the revision cancels a live gesture before readView resolves the reset.
    setResetRevision((revision) => revision + 1);
    requestDraw();
  }, [requestDraw]);

  // Observe layout size changes before drawing and disconnect the observer on cleanup.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      sizeRef.current = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      requestDraw();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, requestDraw]);

  // Reset navigation when the binding or image dimensions change, preserving it for new frames.
  useLayoutEffect(() => {
    const previous = identityRef.current;
    const width = source?.width ?? 0;
    const height = source?.height ?? 0;
    if (
      !previous ||
      previous.identity !== identity ||
      previous.width !== width ||
      previous.height !== height
    ) {
      identityRef.current = { identity, width, height };
      reset();
    }
  }, [source, identity, reset]);

  // Attach shared selection, pan, drag zoom, reset, and cancellation behavior to this viewport.
  useMouseGestures({
    containerRef,
    selectionRef,
    viewport,
    tool,
    // Image rows increase downward, matching canvas Y rather than Cartesian graph Y.
    inverted: { x: false, y: true },
    logarithmicY: false,
    lockZoom: plotConfig.aspect_ratio !== 0,
    activeRef,
    getRanges: viewport.readRanges,
    setRanges: viewport.setRanges,
    complete: completeGesture,
    finish: finishGesture,
    reset,
    resetRevision,
  });

  // Apply wheel zoom to current ranges outside active drags, suppressing handled page scrolls.
  const zoomWithWheel = useCallback(
    (event: WheelEvent) => {
      const container = containerRef.current;
      const bounds = viewport.readBounds();
      const ranges = rangesRef.current;
      if (!container || !bounds || !ranges || activeRef.current) {
        return;
      }
      const next = wheelZoomRanges({
        event,
        rect: container.getBoundingClientRect(),
        size: sizeRef.current,
        bounds,
        ranges,
      });
      if (!next) {
        return;
      }
      viewport.setRanges(next);
      event.preventDefault();
    },
    [containerRef, viewport]
  );

  // Subscribe the stable wheel handler and remove the same listener on cleanup.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    // A non-passive listener allows handled zooms to suppress page scrolling.
    container.addEventListener('wheel', zoomWithWheel, { passive: false });
    return () => container.removeEventListener('wheel', zoomWithWheel);
  }, [containerRef, zoomWithWheel]);
  return {
    selectionRef,
    viewport,
    readView,
    tool,
    selectTool,
    reset,
  };
}
