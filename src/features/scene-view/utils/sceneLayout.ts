/**
 * sceneLayout — pure, testable functions for Karabo scene layout math.
 *
 * No React. No side effects. Each function has one job.
 * Used by SceneView (and tested independently).
 */

import type React from 'react';

// ZoomMode
// ---

export type ZoomMode =
  | 'fit-page' // whole scene visible, never zooms in (≤ 100%)
  | 'fit-screen' // whole scene visible, may zoom in to fill viewport
  | 'fit-width' // scene width fills viewport, height may overflow → scroll Y
  | 'fit-height' // scene height fills viewport, width may overflow → scroll X
  | 'actual'; // 1:1 pixel mapping, both axes may overflow

export type Size = { width: number; height: number };

// computeScale
// ---
// Returns the CSS scale factor to apply to the stage.

export function computeScale(
  mode: ZoomMode,
  viewport: Size,
  scene: Size
): number {
  if (
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    scene.width <= 0 ||
    scene.height <= 0
  ) {
    return 1;
  }

  const scaleToWidth = viewport.width / scene.width;
  const scaleToHeight = viewport.height / scene.height;
  const scaleToFit = Math.min(scaleToWidth, scaleToHeight);

  switch (mode) {
    case 'fit-page':
      return Math.min(scaleToFit, 1);
    case 'fit-screen':
      return scaleToFit;
    case 'fit-width':
      return scaleToWidth;
    case 'fit-height':
      return scaleToHeight;
    case 'actual':
      return 1;
  }
}

// isScrollableMode
// ---
// Scrollable modes anchor the stage top-left and need a scroll spacer.
// Non-scrollable modes center the stage with CSS grid.

export function isScrollableMode(mode: ZoomMode): boolean {
  return mode === 'fit-width' || mode === 'fit-height' || mode === 'actual';
}

// getOverflow
// ---
// Controls which axes scroll. Only the axis that can overflow gets 'auto'.

export function getOverflow(mode: ZoomMode): {
  overflowX: React.CSSProperties['overflowX'];
  overflowY: React.CSSProperties['overflowY'];
} {
  return {
    overflowX:
      mode === 'fit-height' || mode === 'actual' || mode === 'fit-screen'
        ? 'auto'
        : 'hidden',
    overflowY:
      mode === 'fit-width' || mode === 'actual' || mode === 'fit-screen'
        ? 'auto'
        : 'hidden',
  };
}

// getSpacerSize
// ---
// Exact scaled dimensions — gives the browser real px to scroll against.
// Must NOT use Math.max(viewport, scaled): that creates phantom scroll space.
// Only needed in scrollable modes; non-scrollable modes use CSS grid centering.

export function getSpacerSize(scaledW: number, scaledH: number): Size {
  return { width: scaledW, height: scaledH };
}
