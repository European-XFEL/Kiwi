/**

 *
 * Layout model classes (BoxLayout, FixedLayout, GridLayout)
 */

import { BaseLayoutElementModel, BaseSceneElementModel } from './BaseModels';
import type {
  BoxLayoutProps,
  FixedLayoutProps,
  GridLayoutProps,
} from '../scene_types/layouts';
import type { SceneElementProps } from '../scene_types/scene';

// ============================================================================
// BoxLayout
// ============================================================================

/**
 * BoxLayoutModel — arranges children sequentially in one direction.
 */
export class BoxLayoutModel extends BaseLayoutElementModel<BoxLayoutProps> {
  /** Layout direction: 0=LeftToRight, 1=RightToLeft, 2=TopToBottom, 3=BottomToTop */
  direction: 0 | 1 | 2 | 3 = 0;

  /** Render / serialization props. */
  get props(): BoxLayoutProps {
    return {
      element_type: 'layout',
      layout_type: 'BoxLayout',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      direction: this.direction,
      children: this.children.map(
        (child) => child.props
      ) as SceneElementProps[],
      layout_data: this.layout_data,
    };
  }

  /** Get direction as human-readable string. */
  getDirectionName(): string {
    const names = ['LeftToRight', 'RightToLeft', 'TopToBottom', 'BottomToTop'];
    return names[this.direction];
  }

  /** True if layout is horizontal. */
  isHorizontal(): boolean {
    return this.direction === 0 || this.direction === 1;
  }

  /** True if layout is vertical. */
  isVertical(): boolean {
    return this.direction === 2 || this.direction === 3;
  }
}

// ============================================================================
// FixedLayout
// ============================================================================

/**
 * FixedLayoutModel — groups elements using absolute positioning.
 */
export class FixedLayoutModel extends BaseLayoutElementModel<FixedLayoutProps> {
  /** Optional “entire” element representing the complete layout region. */
  entire?: BaseSceneElementModel;

  get props(): FixedLayoutProps {
    return {
      element_type: 'layout',
      layout_type: 'FixedLayout',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      children: this.children.map(
        (child) => child.props
      ) as SceneElementProps[],
      entire: this.entire?.props as SceneElementProps | undefined,
      layout_data: this.layout_data,
    };
  }

  /** Assign the “entire” element to this layout. */
  setEntire(element: BaseSceneElementModel): void {
    this.entire = element;

    // Add to children if not already included
    if (!this.children.includes(element)) {
      this.children.push(element);
    }
  }
}

// ============================================================================
// GridLayout
// ============================================================================

/**
 * GridLayoutModel — arranges children in a grid pattern.
 */
export class GridLayoutModel extends BaseLayoutElementModel<GridLayoutProps> {
  get props(): GridLayoutProps {
    return {
      element_type: 'layout',
      layout_type: 'GridLayout',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      children: this.children.map(
        (child) => child.props
      ) as SceneElementProps[],
      layout_data: this.layout_data,
    };
  }

  /** Add a child at a specific grid position. */
  addChildAtPosition(
    child: BaseSceneElementModel,
    row: number,
    col: number,
    rowspan = 1,
    colspan = 1
  ): void {
    child.layout_data = { row, col, rowspan, colspan };
    this.addChild(child);
  }

  /** Retrieve a child element at a given grid position. */
  getChildAtPosition(
    row: number,
    col: number
  ): BaseSceneElementModel | undefined {
    return this.children.find((child) => {
      const data = child.layout_data as
        | { row: number; col: number }
        | undefined;
      return data?.row === row && data?.col === col;
    });
  }

  /** Compute grid dimensions (max row and col indices). */
  getGridDimensions(): { rows: number; cols: number } {
    let maxRow = 0;
    let maxCol = 0;

    for (const child of this.children) {
      const data = child.layout_data as
        | { row: number; col: number; rowspan?: number; colspan?: number }
        | undefined;

      if (data) {
        maxRow = Math.max(maxRow, data.row + (data.rowspan ?? 1));
        maxCol = Math.max(maxCol, data.col + (data.colspan ?? 1));
      }
    }

    return { rows: maxRow, cols: maxCol };
  }
}
