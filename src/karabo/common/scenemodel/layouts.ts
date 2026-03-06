/**
 * Layout models — BoxLayout, FixedLayout, GridLayout.
 *
 * All layouts are containers with children[]. Positioning differs per type:
 *  - BoxLayout:   flexbox — children flow in `direction` (automatic)
 *  - FixedLayout: absolute — children positioned via FixedLayoutChildData(x, y, w, h)
 *  - GridLayout:  grid — children placed in cells via GridLayoutChildData(row, col, span)
 */

import {
  BaseLayoutModel,
  BaseSceneObjectData,
  GridLayoutChildData,
} from './bases';
import {
  readBaseLayoutData,
  readChildren,
  collectSvgChildren,
  toNum,
} from './util';
import { registerReader, readElement } from './Registry';

// Direction
// ----------------------------------------------------------------------------

export enum Direction {
  LeftToRight = 0,
  RightToLeft = 1,
  TopToBottom = 2,
  BottomToTop = 3,
}

// BoxLayout
// ----------------------------------------------------------------------------

/** Arranges children sequentially in one direction. */
export class BoxLayoutModel extends BaseLayoutModel {
  direction: Direction = Direction.LeftToRight;
}

registerReader('BoxLayout', (json) => {
  const layout = new BoxLayoutModel();

  readBaseLayoutData(json, layout);
  layout.direction = toNum(json['@_krb:direction']) as Direction;
  layout.children = readChildren(json);

  return layout;
});

// FixedLayout
// ----------------------------------------------------------------------------

/** Groups elements using absolute positioning. */
export class FixedLayoutModel extends BaseLayoutModel {
  entire?: BaseSceneObjectData;
}

registerReader('FixedLayout', (json) => {
  const layout = new FixedLayoutModel();

  readBaseLayoutData(json, layout);
  layout.children = readChildren(json);

  return layout;
});

// GridLayout
// ----------------------------------------------------------------------------

/** Arranges children in a grid pattern. */
export class GridLayoutModel extends BaseLayoutModel {}

registerReader('GridLayout', (json) => {
  const layout = new GridLayoutModel();

  readBaseLayoutData(json, layout);

  layout.children = collectSvgChildren(json).map(({ element, tag }) => {
    const child = readElement(element, tag);
    const ld = new GridLayoutChildData();
    ld.row = toNum(element['@_krb:row']);
    ld.col = toNum(element['@_krb:col']);
    ld.rowspan = toNum(element['@_krb:rowspan']) || 1;
    ld.colspan = toNum(element['@_krb:colspan']) || 1;
    child.layout_data = ld;
    return child;
  });

  return layout;
});
