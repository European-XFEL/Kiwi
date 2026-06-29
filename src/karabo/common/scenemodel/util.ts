/**
 * Shared helpers for reader functions.
 */

import type {
  BaseLayoutModel,
  BaseLinkModel,
  BaseSceneObjectData,
  BaseShapeObjectData,
  BaseWidgetObjectData,
} from './bases';
import { readElement } from './Registry';
import { ATTR_KRB_CLASS, ATTR_KRB_WIDGET } from './constants';

import { FixedLayoutChildData, GridLayoutChildData } from './bases';
import type { FixedLayoutModel } from './layouts';

export function toNum(value: unknown, fallback = 0): number {
  const parsed = parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toStr(value: unknown, fallback = ''): string {
  return value != null ? String(value) : fallback;
}

/** Parses XML boolean strings — accepts Python "True" and JS "true". */
export function toBool(value: unknown, fallback = false): boolean {
  if (value == null) return fallback;
  return String(value).toLowerCase() === 'true';
}

export interface ParsedChildElement {
  tag: string;
  element: Record<string, unknown>;
}

function isElement(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Collect direct nested SVG children from a parsed element. */
export function collectSvgChildren(
  json: Record<string, unknown>
): ParsedChildElement[] {
  const children: ParsedChildElement[] = [];

  for (const [tag, value] of Object.entries(json)) {
    if (!tag.startsWith('svg:')) continue;

    // Multiple siblings with the same tag come as an array
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isElement(item)) children.push({ tag, element: item });
      }
      continue;
    }

    // Single child comes as a plain object
    if (isElement(value)) {
      children.push({ tag, element: value });
    }
  }

  return children;
}

/** Collect and read all nested SVG children into model instances. */
export function readChildren(
  json: Record<string, unknown>
): BaseSceneObjectData[] {
  return collectSvgChildren(json).map((child) =>
    readElement(child.element, child.tag)
  );
}

export function readBaseLayoutData(
  json: Record<string, unknown>,
  model: BaseLayoutModel
): void {
  model.x = toNum(json['@_krb:x']);
  model.y = toNum(json['@_krb:y']);
  model.width = toNum(json['@_krb:width']);
  model.height = toNum(json['@_krb:height']);
}

export function readBaseShapeData(
  json: Record<string, unknown>,
  model: BaseShapeObjectData
): void {
  // Stroke
  model.stroke = toStr(json['@_stroke'], 'none');
  model.stroke_opacity = toNum(json['@_stroke-opacity'], 1.0);
  model.stroke_width = toNum(json['@_stroke-width'], 1.0);
  model.stroke_linecap = toStr(json['@_stroke-linecap'], 'butt') as
    'butt' | 'square' | 'round';
  model.stroke_linejoin = toStr(json['@_stroke-linejoin'], 'miter') as
    'miter' | 'round' | 'bevel';
  model.stroke_miterlimit = toNum(json['@_stroke-miterlimit'], 4.0);
  model.stroke_dashoffset = toNum(json['@_stroke-dashoffset'], 0.0);
  model.stroke_dasharray = toStr(json['@_stroke-dasharray'])
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  model.stroke_style = toNum(json['@_stroke-style'], 1);

  // Fill
  model.fill = toStr(json['@_fill'], 'none');
  model.fill_opacity = toNum(json['@_fill-opacity'], 1.0);
}

export function readBaseWidgetData(
  json: Record<string, unknown>,
  model: BaseWidgetObjectData
): void {
  model.x = toNum(json['@_x']);
  model.y = toNum(json['@_y']);
  model.width = toNum(json['@_width']);
  model.height = toNum(json['@_height']);
  model.keys = toStr(json['@_krb:keys'])
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  model.klass = toStr(json[ATTR_KRB_WIDGET]) || toStr(json[ATTR_KRB_CLASS]);
  const parentComponent = json[ATTR_KRB_CLASS];
  if (parentComponent !== undefined) {
    model.parent_component = toStr(parentComponent);
  }
}
export function readBaseLinkData(
  json: Record<string, unknown>,
  model: BaseLinkModel
): void {
  readBaseWidgetData(json, model);
  model.target = toStr(json['@_krb:target']);
  model.text = toStr(json['@_krb:text']);
  model.font = toStr(json['@_krb:font'], model.font);
  model.foreground = toStr(json['@_krb:foreground']);
  model.background = toStr(json['@_krb:background'], model.background);
  model.frame_width = toNum(json['@_krb:frameWidth'], model.frame_width);
}

// createModel
// ----------------------------------------------------------------------------

/** Instantiate a model class and overlay parsed attributes onto its defaults. */
export function createModel<T>(
  ModelClass: new () => T,
  attributes?: Record<string, unknown>
): T {
  const model = new ModelClass();
  if (attributes) Object.assign(model as object, attributes);
  return model;
}

// resolveParentComponent
// ----------------------------------------------------------------------------

/** "Editable..." → EditableApplyLaterComponent, everything else → DisplayComponent. */
export function resolveParentComponent(klass: string): string {
  return klass.startsWith('Editable')
    ? 'EditableApplyLaterComponent'
    : 'DisplayComponent';
}

// FixedLayout helpers — absolute positioning (like CSS position: absolute)
// ----------------------------------------------------------------------------

/** Attach positioning data to the child, then add it to the layout. */
export function addFixedChild(
  layout: { children: BaseSceneObjectData[] },
  child: BaseSceneObjectData,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const positioning = new FixedLayoutChildData();
  positioning.x = x;
  positioning.y = y;
  positioning.width = width;
  positioning.height = height;
  child.layout_data = positioning;
  layout.children.push(child);
}

/** Mark an element as the full-area background of the layout. */
export function setEntire(
  layout: FixedLayoutModel,
  element: BaseSceneObjectData
): void {
  layout.entire = element;
  if (!layout.children.includes(element)) {
    layout.children.push(element);
  }
}

// GridLayout helpers — row/column grid (like CSS Grid)
// ----------------------------------------------------------------------------

/** Attach grid placement to the child, then add it to the layout. */
export function addGridChild(
  layout: { children: BaseSceneObjectData[] },
  child: BaseSceneObjectData,
  row: number,
  col: number,
  rowspan = 1,
  colspan = 1
): void {
  const placement = new GridLayoutChildData();
  placement.row = row;
  placement.col = col;
  placement.rowspan = rowspan;
  placement.colspan = colspan;
  child.layout_data = placement;
  layout.children.push(child);
}

/** Find the child sitting at a specific grid cell. */
export function getChildAtPosition(
  layout: { children: BaseSceneObjectData[] },
  row: number,
  col: number
): BaseSceneObjectData | undefined {
  return layout.children.find((child) => {
    const placement = child.layout_data;
    return (
      placement instanceof GridLayoutChildData &&
      placement.row === row &&
      placement.col === col
    );
  });
}

/** Scan children to figure out how many rows and columns the grid spans. */
export function getGridDimensions(layout: {
  children: BaseSceneObjectData[];
}): { rows: number; cols: number } {
  let maxRow = 0;
  let maxCol = 0;
  for (const child of layout.children) {
    const placement = child.layout_data;
    if (placement instanceof GridLayoutChildData) {
      maxRow = Math.max(maxRow, placement.row + placement.rowspan);
      maxCol = Math.max(maxCol, placement.col + placement.colspan);
    }
  }
  return { rows: maxRow, cols: maxCol };
}
