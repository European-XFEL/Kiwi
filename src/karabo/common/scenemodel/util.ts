/**
 * Shared helpers for reader functions.
 */

import type {
  BaseLayoutModel,
  BaseLinkModel,
  BaseSceneLinkModel,
  BaseSceneObjectData,
  BaseShapeObjectData,
  BaseWidgetObjectData,
} from './bases';
import { readElement } from './Registry';
import { ATTR_KRB_CLASS, ATTR_KRB_WIDGET } from './constants';
import { krbAttr, xmlAttr } from './xml';

import { FixedLayoutChildData, GridLayoutChildData } from './bases';
import type { FixedLayoutModel } from './layouts';

export { krbAttr, xmlAttr } from './xml';

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
  element: Element;
}

export function childElements(element: Element): Element[] {
  return Array.from(element.children);
}

/** Collect direct nested SVG children from an XML element. */
export function collectSvgChildren(element: Element): ParsedChildElement[] {
  return childElements(element)
    .filter((child) => child.tagName.startsWith('svg:'))
    .map((child) => ({ tag: child.tagName, element: child }));
}

/** Collect and read all nested SVG children into model instances. */
export function readChildren(element: Element): BaseSceneObjectData[] {
  return collectSvgChildren(element).map((child) =>
    readElement(child.element, child.tag)
  );
}

export function readBaseLayoutData(
  element: Element,
  model: BaseLayoutModel
): void {
  model.x = toNum(krbAttr(element, 'x'));
  model.y = toNum(krbAttr(element, 'y'));
  model.width = toNum(krbAttr(element, 'width'));
  model.height = toNum(krbAttr(element, 'height'));
}

export function readBaseShapeData(
  element: Element,
  model: BaseShapeObjectData
): void {
  // Stroke
  model.stroke = toStr(xmlAttr(element, 'stroke'), 'none');
  model.stroke_opacity = toNum(xmlAttr(element, 'stroke-opacity'), 1.0);
  model.stroke_width = toNum(xmlAttr(element, 'stroke-width'), 1.0);
  model.stroke_linecap = toStr(xmlAttr(element, 'stroke-linecap'), 'butt') as
    'butt' | 'square' | 'round';
  model.stroke_linejoin = toStr(
    xmlAttr(element, 'stroke-linejoin'),
    'miter'
  ) as 'miter' | 'round' | 'bevel';
  model.stroke_miterlimit = toNum(xmlAttr(element, 'stroke-miterlimit'), 4.0);
  model.stroke_dashoffset = toNum(xmlAttr(element, 'stroke-dashoffset'), 0.0);
  model.stroke_dasharray = toStr(xmlAttr(element, 'stroke-dasharray'))
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  model.stroke_style = toNum(xmlAttr(element, 'stroke-style'), 1);

  // Fill
  model.fill = toStr(xmlAttr(element, 'fill'), 'none');
  model.fill_opacity = toNum(xmlAttr(element, 'fill-opacity'), 1.0);

  // Markers
  model.marker_start = toStr(xmlAttr(element, 'marker-start'));
  model.marker_mid = toStr(xmlAttr(element, 'marker-mid'));
  model.marker_end = toStr(xmlAttr(element, 'marker-end'));
}

export function readBaseWidgetData(
  element: Element,
  model: BaseWidgetObjectData
): void {
  model.x = toNum(xmlAttr(element, 'x'));
  model.y = toNum(xmlAttr(element, 'y'));
  model.width = toNum(xmlAttr(element, 'width'));
  model.height = toNum(xmlAttr(element, 'height'));
  model.keys = toStr(krbAttr(element, 'keys'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  model.klass =
    toStr(krbAttr(element, ATTR_KRB_WIDGET)) ||
    toStr(krbAttr(element, ATTR_KRB_CLASS));
  const parentComponent = krbAttr(element, ATTR_KRB_CLASS);
  if (parentComponent !== null) {
    model.parent_component = parentComponent;
  }
}

export function readBaseLinkData(element: Element, model: BaseLinkModel): void {
  readBaseWidgetData(element, model);
  model.target = toStr(krbAttr(element, 'target'));
  model.text = toStr(krbAttr(element, 'text'));
  model.font = toStr(krbAttr(element, 'font'), model.font);
  model.foreground = toStr(krbAttr(element, 'foreground'));
  model.background = toStr(krbAttr(element, 'background'), model.background);
  model.frame_width = toNum(krbAttr(element, 'frameWidth'), model.frame_width);
}

export function readBaseSceneLinkData(
  element: Element,
  model: BaseSceneLinkModel
): void {
  readBaseLinkData(element, model);
  const tw = toStr(krbAttr(element, 'target'));
  if (tw == 'mainwin' || tw === 'dialog') model.target = tw;
}

export function attributesToRecord(element: Element): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const attribute of Array.from(element.attributes)) {
    attributes[attribute.name] = attribute.value;
  }
  return attributes;
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
