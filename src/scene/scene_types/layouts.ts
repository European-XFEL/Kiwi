/**
 * Layout type definitions for scene organization.
 *
 * All layouts extend BaseLayoutProps and can contain children.
 */

import { BaseLayoutProps, BaseSceneObjectProps } from "./base";

/* ──────────────────────────────────────────────────────────────────────────
 * BoxLayout
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Sequential layout that arranges children horizontally or vertically.
 *
 * Direction values follow QBoxLayout::Direction:
 * 0 = LeftToRight, 1 = RightToLeft, 2 = TopToBottom, 3 = BottomToTop
 */
export interface BoxLayoutProps extends BaseLayoutProps {
  layout_type: "BoxLayout";
  direction: 0 | 1 | 2 | 3;
}

/* ──────────────────────────────────────────────────────────────────────────
 * FixedLayout
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Absolute layout where each child defines explicit coordinates.
 *
 * The optional `entire` property can represent a full scene grouping.
 */
export interface FixedLayoutProps extends BaseLayoutProps {
  layout_type: "FixedLayout";
  entire?: BaseSceneObjectProps;
}

/* ──────────────────────────────────────────────────────────────────────────
 * GridLayout
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Grid layout that positions children by row and column.
 *
 * Child positioning data is defined via `layout_data`
 * ({ row, col, rowspan, colspan }).
 */
export interface GridLayoutProps extends BaseLayoutProps {
  layout_type: "GridLayout";
}

// ============================================================================
// Union Type
// ============================================================================

/** All supported layout models. */
export type LayoutTypeProps =
  | BoxLayoutProps
  | FixedLayoutProps
  | GridLayoutProps;
