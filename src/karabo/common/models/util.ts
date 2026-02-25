/**
 * Model utility functions for builders and scene operations.
 */

import {
  BaseSceneObjectData,
  FixedLayoutChildData,
  GridLayoutChildData,
} from './bases';
import type { FixedLayoutModel } from './layouts';

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
