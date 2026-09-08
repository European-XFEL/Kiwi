/**
 * Shared helpers for shape components.
 *
 * All shapes face the same two problems:
 *   1. The stroke extends beyond the bounding box — we pad each side by
 *      half the stroke width so it is never clipped.
 *   2. SVG viewBox lets us keep absolute scene coordinates in the markup
 *      while the shell positions the element.
 */

import type { BaseShapeObjectData } from '@/karabo/common/api';

// strokePad
// ----------------------------------------------------------------------------
// How many pixels to add on each side of the bounding box.
// Ensures the stroke (which extends strokeWidth/2 beyond geometry) is fully visible.

export function strokePad(strokeWidth: number): number {
  return Math.max(Math.ceil(strokeWidth / 2), 1);
}

// shapeSvgProps
// ----------------------------------------------------------------------------
// Returns the SVG element props that position the canvas correctly.
//
// The SVG is sized = bounding box + 2×pad on every side, then offset by
// -pad so it sits centred over the PositionedShell.

export function shapeSvgProps(
  boundingX: number,
  boundingY: number,
  boundingWidth: number,
  boundingHeight: number,
  pad: number
): React.SVGProps<SVGSVGElement> {
  const svgWidth = boundingWidth + pad * 2;
  const svgHeight = boundingHeight + pad * 2;
  const viewBoxX = boundingX - pad;
  const viewBoxY = boundingY - pad;

  return {
    width: svgWidth,
    height: svgHeight,
    viewBox: `${viewBoxX} ${viewBoxY} ${svgWidth} ${svgHeight}`,
    style: {
      display: 'block',
      overflow: 'visible',
      position: 'absolute',
      left: -pad,
      top: -pad,
    },
  };
}

// dashArray
// ----------------------------------------------------------------------------
// stroke-style is Qt's PenStyle enum, and the pen style is what the Karabo GUI
// applies when it loads a scene — re-applying it overrides whatever dash pattern
// was stored, so a file whose stroke-dasharray disagrees with its stroke-style
// renders by the style. We have to do the same or dashes come out the wrong
// length.
//
// Qt's predefined patterns are expressed in units of the pen width, so the SVG
// dash lengths are pattern * strokeWidth. A scene written by Karabo shows this
// directly: a DashLine of width 1 is stored as "4 2", of width 3 as "12 6".

const QT_SOLID_LINE = 1;

const QT_DASH_PATTERNS: Record<number, readonly number[]> = {
  2: [4, 2], // DashLine
  3: [1, 2], // DotLine
  4: [4, 2, 1, 2], // DashDotLine
  5: [4, 2, 1, 2, 1, 2], // DashDotDotLine
};

export function dashArray(model: BaseShapeObjectData): string | undefined {
  const pattern = QT_DASH_PATTERNS[model.stroke_style];
  if (pattern) {
    const penWidth = model.stroke_width || 1;
    return pattern.map((segment) => segment * penWidth).join(' ');
  }

  // Solid pens carry no pattern; anything else (a custom style, or SVG that
  // never went through Qt) keeps whatever the file asked for.
  if (model.stroke_style === QT_SOLID_LINE) return undefined;

  return model.stroke_dasharray.length
    ? model.stroke_dasharray.join(' ')
    : undefined;
}

// strokeFillAttrs
// ----------------------------------------------------------------------------
// All SVG stroke + fill attributes from a shape model in one place.

export function strokeFillAttrs(model: BaseShapeObjectData) {
  return {
    stroke: model.stroke,
    strokeOpacity: model.stroke_opacity,
    strokeWidth: model.stroke_width,
    strokeLinecap: model.stroke_linecap as 'butt' | 'square' | 'round',
    strokeLinejoin: model.stroke_linejoin as 'miter' | 'round' | 'bevel',
    strokeMiterlimit: model.stroke_miterlimit,
    strokeDashoffset: model.stroke_dashoffset,
    strokeDasharray: dashArray(model),
    fill: model.fill,
    fillOpacity: model.fill_opacity,
  };
}
