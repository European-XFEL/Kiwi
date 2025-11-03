/**
 * Root scene prop definitions and union types for all scene elements.
 */

import { LayoutTypeProps } from "./layouts";
import type { ShapeProps } from "./shapes";
import type { StaticWidgetProps } from "./staticWidgets";
import type { ControllerTypeProps } from "./controllers";

/* ──────────────────────────────────────────────────────────────────────────
 * Scene Element Union
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Any element that can exist in a scene.
 * Used for `children` arrays across all layout containers.
 */
export type SceneElementProps =
  | LayoutTypeProps // BoxLayout, FixedLayout, GridLayout
  | ShapeProps // Line, Rectangle, ArrowPolygon, etc.
  | StaticWidgetProps // Static widgets (e.g. Label)
  | ControllerTypeProps; // Display*, Editable*, etc.

/* ──────────────────────────────────────────────────────────────────────────
 * Scene Root
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * SceneProps — represents the root <svg:svg> element.
 */
export interface SceneProps {
  /** Scene file format version (krb:version). */
  file_format_version: number;

  /** Unique identifier (krb:uuid). */
  uuid?: string;

  /** Canvas width in pixels. */
  width: number;

  /** Canvas height in pixels. */
  height: number;

  /** Top-level elements in the scene (layouts, shapes, widgets). */
  children: SceneElementProps[];

  /** Optional map of extra SVG attributes to preserve. */
  extra_attributes?: Record<string, string>;
}
