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
  krbAttr,
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

registerReader('BoxLayout', (element) => {
  const layout = new BoxLayoutModel();

  readBaseLayoutData(element, layout);
  layout.direction = toNum(krbAttr(element, 'direction')) as Direction;
  layout.children = readChildren(element);

  return layout;
});

// FixedLayout
// ----------------------------------------------------------------------------

/** Groups elements using absolute positioning. */
export class FixedLayoutModel extends BaseLayoutModel {
  entire?: BaseSceneObjectData;
}

registerReader('FixedLayout', (element) => {
  const layout = new FixedLayoutModel();

  readBaseLayoutData(element, layout);
  layout.children = readChildren(element);

  return layout;
});

// GridLayout
// ----------------------------------------------------------------------------

/** Arranges children in a grid pattern. */
export class GridLayoutModel extends BaseLayoutModel {}

registerReader('GridLayout', (element) => {
  const layout = new GridLayoutModel();

  readBaseLayoutData(element, layout);

  layout.children = collectSvgChildren(element).map(
    ({ element: childElement, tag }) => {
      const child = readElement(childElement, tag);
      const ld = new GridLayoutChildData();
      ld.row = toNum(krbAttr(childElement, 'row'));
      ld.col = toNum(krbAttr(childElement, 'col'));
      ld.rowspan = toNum(krbAttr(childElement, 'rowspan')) || 1;
      ld.colspan = toNum(krbAttr(childElement, 'colspan')) || 1;
      child.layout_data = ld;
      return child;
    }
  );

  return layout;
});
