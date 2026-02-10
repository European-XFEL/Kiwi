/**
 * Layout models — BoxLayout, FixedLayout, GridLayout.
 *
 * All layouts are containers with children[]. Positioning differs per type:
 *  - BoxLayout:   flexbox — children flow in `direction` (automatic)
 *  - FixedLayout: absolute — children positioned via FixedLayoutChildData(x, y, w, h)
 *  - GridLayout:  grid — children placed in cells via GridLayoutChildData(row, col, span)
 */

import { BaseLayoutModel, BaseSceneObjectData } from './bases';

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

// FixedLayout
// ----------------------------------------------------------------------------

/** Groups elements using absolute positioning. */
export class FixedLayoutModel extends BaseLayoutModel {
  entire?: BaseSceneObjectData;
}

// GridLayout
// ----------------------------------------------------------------------------

/** Arranges children in a grid pattern. */
export class GridLayoutModel extends BaseLayoutModel {}
