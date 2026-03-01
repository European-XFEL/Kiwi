/**
 * Shared helpers for shape components.
 *
 * All shapes face the same two problems:
 *   1. The stroke extends beyond the bounding box — we pad each side by
 *      half the stroke width so it is never clipped.
 *   2. SVG viewBox lets us keep absolute scene coordinates in the markup
 *      while the shell positions the element.
 */

import type { BaseShapeObjectData } from '@/karabo/common/models/bases';

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
    strokeDasharray: model.stroke_dasharray.length
      ? model.stroke_dasharray.join(' ')
      : undefined,
    fill: model.fill,
    fillOpacity: model.fill_opacity,
  };
}
