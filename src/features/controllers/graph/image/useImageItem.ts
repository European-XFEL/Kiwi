import { type PlotSettings } from '@/karabo/common/api';
import { useCallback, useLayoutEffect, useRef } from 'react';
import Konva from 'konva';

import { drawImageDecorations } from './decorations';
import { drawImageColorBar } from './ImageColorBar';
import {
  rasterize,
  sampleLimits,
  type ImageLimits,
  type ImageSize,
  type ImageSource,
} from './raster';
import type { ImageView } from './useImageViewBox';

// Image widgets own the render loop; attribute changes must not queue extra draws.
Konva.autoDrawEnabled = false;

type ImageFrame = {
  source: ImageSource | undefined;
  plotConfig: PlotSettings;
  placeholder: string | undefined;
  imageOnly: boolean;
  readView: () => ImageView;
};

function isEmptySize({ width, height }: ImageSize) {
  return width <= 0 || height <= 0;
}

function resizeCanvasIfNeeded(canvas: HTMLCanvasElement, size: ImageSize) {
  // Assigning unchanged dimensions still clears and reallocates the canvas.
  if (canvas.width !== size.width) {
    canvas.width = size.width;
  }
  if (canvas.height !== size.height) {
    canvas.height = size.height;
  }
}

function uploadRaster({
  context,
  raster,
  imageData,
}: {
  context: CanvasRenderingContext2D;
  raster: ReturnType<typeof rasterize>;
  imageData: ImageData | undefined;
}) {
  if (
    !imageData ||
    imageData.width !== raster.width ||
    imageData.height !== raster.height
  ) {
    imageData = context.createImageData(raster.width, raster.height);
  }
  // Steady frames rasterize directly into ImageData.data; only a new buffer needs copying.
  if (imageData.data !== raster.pixels) {
    imageData.data.set(raster.pixels);
  }
  context.putImageData(imageData, 0, 0);
  return imageData;
}

/**
 * Owns drawing resources and coalesces publication and navigation into one frame.
 *
 * Drawing flow:
 *   New source or settings
 *     -> publish(frame)
 *       -> requestDraw()
 *         -> requestAnimationFrame
 *           -> draw()
 *
 * Responsibilities:
 *   publish:
 *     Store the latest source and settings, then request a draw. Further
 *     publications replace pending input so only the newest frame is drawn.
 *   requestDraw:
 *     Schedule at most one pending animation frame. Pan, zoom, and resize call
 *     this directly because the source is unchanged.
 *   draw:
 *     Read the latest input and current viewport, rasterize the image, update
 *     its geometry, and explicitly draw the raster and decoration layers.
 */
export function useImageItem() {
  // Outer viewport measured by useImageViewBox and used for mouse gestures.
  const containerRef = useRef<HTMLDivElement>(null);
  // DOM host for the Konva stage and its canvases.
  const stageRef = useRef<HTMLDivElement>(null);
  // DOM overlay positioned over the fitted webcam image for its live indicator.
  const overlayRef = useRef<HTMLDivElement>(null);
  // Latest published source and settings, read when the scheduled draw runs.
  const inputRef = useRef<ImageFrame | undefined>(undefined);
  // Scheduled animation frame ID; coalesces redraw requests and allows cancellation.
  const pending = useRef<number | undefined>(undefined);
  // Konva resources retained across frames and destroyed together on unmount.
  const sceneRef = useRef<
    | {
        stage: Konva.Stage;
        raster: Konva.Layer;
        image: Konva.Image;
        imageGroup: Konva.Group;
        decorations: Konva.Layer;
      }
    | undefined
  >(undefined);
  // Reusable pixel canvas assigned once as the Konva image source.
  const backingRef = useRef<HTMLCanvasElement | undefined>(undefined);
  // Reusable upload buffer, also passed to rasterize to avoid allocating each frame.
  const imageDataRef = useRef<ImageData | undefined>(undefined);
  // Cached automatic intensity limits, reused during navigation of the same source.
  const limitsRef = useRef<ImageLimits>([0, 255]);
  // Limits used for the current raster, including configured overrides, for the colorbar.
  const effectiveLimitsRef = useRef<ImageLimits>([0, 255]);
  // Source identity used to decide when automatic limits need resampling.
  const limitsSourceRef = useRef<ImageSource | undefined>(undefined);
  // Snapshot scalar inputs: settings and ranges can be mutated in place by callers.
  const decorationInputsRef = useRef<unknown[] | undefined>(undefined);

  // Rasterize the latest frame and redraw image axes only when their inputs change.
  const draw = useCallback(() => {
    const frame = inputRef.current;
    if (!frame) {
      return;
    }
    const { source, plotConfig } = frame;
    // Read geometry at draw time so coalesced resizes and gestures use the latest view.
    const { size, bounds, ranges } = frame.readView();
    const scene = sceneRef.current;
    const canvas = backingRef.current;
    const width = source?.width ?? 0;
    const height = source?.height ?? 0;
    const overlay = overlayRef.current;
    if (overlay) {
      // Match the fitted image rectangle so the live indicator follows letterboxing.
      let imageWidth = size.width;
      let imageHeight = size.height;
      if (source) {
        const scale = Math.min(size.width / width, size.height / height);
        imageWidth = width * scale;
        imageHeight = height * scale;
      }
      Object.assign(overlay.style, {
        left: `${(size.width - imageWidth) / 2}px`,
        top: `${(size.height - imageHeight) / 2}px`,
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        display: imageWidth > 0 && imageHeight > 0 ? '' : 'none',
      });
    }
    const plotSize = {
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
    };
    if (!scene || !canvas || isEmptySize(size) || isEmptySize(plotSize)) {
      return;
    }
    if (
      scene.stage.width() !== size.width ||
      scene.stage.height() !== size.height
    ) {
      scene.stage.size(size);
    }
    // The raster includes overscan; clip only the image to preserve axes and colorbar gutters.
    scene.imageGroup.setAttrs({
      clipX: bounds.left,
      clipY: bounds.top,
      clipWidth: plotSize.width,
      clipHeight: plotSize.height,
    });
    if (source) {
      const fixed = plotConfig.color_levels;
      let limits: ImageLimits;
      if (
        fixed?.length === 2 &&
        fixed.every(Number.isFinite) &&
        fixed[0] <= fixed[1]
      ) {
        limits = fixed as [number, number];
        // Returning to automatic levels must sample the latest source, even if unchanged.
        limitsSourceRef.current = undefined;
      } else {
        // Navigation changes the crop, but automatic contrast still describes the source frame.
        if (limitsSourceRef.current !== source) {
          limitsSourceRef.current = source;
          limitsRef.current = source.color ? [0, 255] : sampleLimits(source);
        }
        limits = limitsRef.current;
      }
      // Decorations must display the same contrast limits that produced these pixels.
      effectiveLimitsRef.current = limits;
      const raster = rasterize({
        source,
        ranges,
        size: plotSize,
        colormap: plotConfig.colormap,
        limits,
        buffer: imageDataRef.current?.data,
      });
      const context = canvas.getContext('2d');
      scene.image.visible(raster.width > 0 && raster.height > 0);
      if (context && raster.width > 0 && raster.height > 0) {
        resizeCanvasIfNeeded(canvas, raster);
        imageDataRef.current = uploadRaster({
          context,
          raster,
          imageData: imageDataRef.current,
        });
        // Map source-pixel coordinates into stage coordinates. The cropped canvas
        // covers only part of the view, so its origin includes the crop offset.
        const sx = plotSize.width / (ranges.x[1] - ranges.x[0]);
        const sy = plotSize.height / (ranges.y[1] - ranges.y[0]);
        // Keep the canvas image attribute unchanged: reassigning it queues batchDraw.
        scene.image.position({
          x: bounds.left + (raster.crop.x - ranges.x[0]) * sx,
          y: bounds.top + (raster.crop.y - ranges.y[0]) * sy,
        });
        scene.image.size({
          width: raster.crop.width * sx,
          height: raster.crop.height * sy,
        });
      }
    } else {
      scene.image.visible(false);
      limitsRef.current = [0, 255];
      effectiveLimitsRef.current = limitsRef.current;
      limitsSourceRef.current = undefined;
    }
    // The backing canvas mutates without a Konva attribute change on steady frames.
    scene.raster.draw();
    const decorationInputs: unknown[] = [
      size.width,
      size.height,
      bounds.left,
      bounds.right,
      bounds.top,
      bounds.bottom,
      frame.placeholder,
      frame.imageOnly,
    ];
    if (!frame.imageOnly) {
      decorationInputs.push(
        ranges.x[0],
        ranges.x[1],
        ranges.y[0],
        ranges.y[1],
        plotConfig.x_label,
        plotConfig.y_label,
        plotConfig.x_units,
        plotConfig.y_units,
        plotConfig.x_scale,
        plotConfig.y_scale,
        plotConfig.x_translate,
        plotConfig.y_translate,
        plotConfig.show_scale
      );
    }
    const previous = decorationInputsRef.current;
    if (
      !previous ||
      previous.length !== decorationInputs.length ||
      decorationInputs.some(
        (value, index) => !Object.is(value, previous[index])
      )
    ) {
      scene.decorations.draw();
      decorationInputsRef.current = decorationInputs;
    }
  }, []);

  // Coalesce publication, resize, and gesture updates into one animation-frame draw.
  const requestDraw = useCallback(() => {
    // Gesture cleanup can invalidate after the stage has already been destroyed.
    if (!sceneRef.current || pending.current !== undefined) {
      return;
    }
    pending.current = requestAnimationFrame(() => {
      pending.current = undefined;
      draw();
    });
  }, [draw]);
  // Store the newest frame and schedule rendering without triggering a React render.
  const publish = useCallback(
    (frame: ImageFrame) => {
      if (!sceneRef.current) {
        return;
      }
      // Replace pending input rather than queuing source frames during a burst of updates.
      inputRef.current = frame;
      requestDraw();
    },
    [requestDraw]
  );

  // Create the stage, layers, and backing canvas before publication; dispose them on cleanup.
  useLayoutEffect(() => {
    const host = stageRef.current;
    if (!host) {
      return;
    }
    // DOM listeners own gestures; these nodes do not need Konva hit detection.
    const stage = new Konva.Stage({
      container: host,
      width: 0,
      height: 0,
      listening: false,
    });
    // Each layer owns a canvas. Keep axes separate from the clipped pixel raster.
    const raster = new Konva.Layer({
      listening: false,
      // Preserve discrete source pixels when Konva scales the downsampled canvas.
      imageSmoothingEnabled: false,
    });
    const decorations = new Konva.Layer({ listening: false });
    // Pixels and colorbar change together; only the image group needs clipping.
    const imageGroup = new Konva.Group({ listening: false });
    const canvas = document.createElement('canvas');
    const image = new Konva.Image({
      image: canvas,
      listening: false,
      perfectDrawEnabled: false,
    });
    imageGroup.add(image);
    raster.add(imageGroup);
    decorations.add(
      new Konva.Shape({
        listening: false,
        perfectDrawEnabled: false,
        sceneFunc: (context) => {
          const current = inputRef.current;
          if (!current) {
            return;
          }
          const { ranges, bounds } = current.readView();
          // Decoration helpers draw directly on the native 2D context during a layer draw.
          drawImageDecorations(context._context, {
            plotConfig: current.plotConfig,
            ranges,
            bounds,
            placeholder: current.placeholder,
            imageOnly: current.imageOnly,
          });
        },
      })
    );
    raster.add(
      new Konva.Shape({
        listening: false,
        perfectDrawEnabled: false,
        sceneFunc: (context) => {
          const current = inputRef.current;
          if (!current || current.imageOnly || current.source?.color) {
            return;
          }
          const { bounds } = current.readView();
          if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
            return;
          }
          drawImageColorBar(context._context, {
            x: bounds.right + 14,
            top: bounds.top,
            height: bounds.bottom - bounds.top,
            colormap: current.plotConfig.colormap,
            limits: effectiveLimitsRef.current,
          });
        },
      })
    );
    stage.add(raster, decorations);
    sceneRef.current = { stage, raster, image, imageGroup, decorations };
    backingRef.current = canvas;
    // Canvas text does not repaint itself when a web font replaces its fallback.
    const fonts = document.fonts;
    const refreshFonts = () => {
      decorationInputsRef.current = undefined;
      requestDraw();
    };
    fonts?.addEventListener('loadingdone', refreshFonts);
    return () => {
      fonts?.removeEventListener('loadingdone', refreshFonts);
      // Cancel our frame before destroying Konva's canvases; a queued draw reads both.
      if (pending.current !== undefined) {
        cancelAnimationFrame(pending.current);
        pending.current = undefined;
      }
      stage.destroy();
      sceneRef.current = undefined;
      backingRef.current = undefined;
      imageDataRef.current = undefined;
      inputRef.current = undefined;
      limitsSourceRef.current = undefined;
      decorationInputsRef.current = undefined;
    };
  }, [requestDraw]);

  return { containerRef, stageRef, overlayRef, publish, requestDraw };
}
