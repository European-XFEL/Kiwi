/**
 * Shared helpers for shape components.
 *
 * All shapes face the same three problems:
 *   1. The stroke extends beyond the bounding box — we pad each side by
 *      half the stroke width so it is never clipped.
 *   2. SVG viewBox lets us keep absolute scene coordinates in the markup
 *      while the shell positions the element.
 *   3. Definitions they reference (markers, gradients) live in one shared
 *      document, so the ids have to be scoped per scene.
 */

import React from 'react';
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

// Defs scope
// ----------------------------------------------------------------------------
// A scene's <defs> ids land in the shared HTML document, where url(#id) resolves
// document-wide. Karabo writes generic ids ("marker288071", "Arrow2Send"), so two
// scenes open at once would otherwise resolve each other's definitions. Each
// mounted scene supplies a scope that prefixes every id it defines and every
// reference to it.

export const DefsScopeContext = React.createContext('');

export const useDefsScope = (): string => React.useContext(DefsScopeContext);

export function scopedId(id: string, scope: string): string {
  return scope ? `${scope}-${id}` : id;
}

const FUNC_IRI = /^url\((['"]?)#(.+)\1\)$/;

/** Rewrites "url(#marker1)" to point at this scene's copy of the definition. */
export function scopedFuncIri(value: string, scope: string): string {
  const match = FUNC_IRI.exec(value.trim());
  return match ? `url(#${scopedId(match[2], scope)})` : value;
}

// useShapeAttrs
// ----------------------------------------------------------------------------
// All SVG stroke, fill and marker attributes from a shape model in one place.
// Markers, gradients and any other funcIRI are resolved against the defs scope.

export function useShapeAttrs(model: BaseShapeObjectData) {
  const scope = useDefsScope();
  const marker = (value: string) =>
    value ? scopedFuncIri(value, scope) : undefined;

  return {
    stroke: scopedFuncIri(model.stroke, scope),
    strokeOpacity: model.stroke_opacity,
    strokeWidth: model.stroke_width,
    strokeLinecap: model.stroke_linecap as 'butt' | 'square' | 'round',
    strokeLinejoin: model.stroke_linejoin as 'miter' | 'round' | 'bevel',
    strokeMiterlimit: model.stroke_miterlimit,
    strokeDashoffset: model.stroke_dashoffset,
    strokeDasharray: dashArray(model),
    fill: scopedFuncIri(model.fill, scope),
    fillOpacity: model.fill_opacity,
    markerStart: marker(model.marker_start),
    markerMid: marker(model.marker_mid),
    markerEnd: marker(model.marker_end),
  };
}
