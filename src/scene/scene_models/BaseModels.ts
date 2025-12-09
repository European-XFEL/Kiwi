/**
 * scene_model/BaseModels.ts
 *
 * Base model classes for all scene elements.
 * Each derived model provides its own `props` getter for React rendering.
 */

import { FONT_BASE_SIZE } from "@/components/shared/helpers/fontDefaults";
import type {
  BaseSceneObjectProps,
  BaseWidgetProps,
  BaseShapeProps,
  BaseLayoutProps,
  BaseControllerKind,
} from "../scene_types/base";

// ============================================================================
// Base Scene Element
// ============================================================================

/**
 * Abstract base class for all scene elements (layouts, shapes, widgets).
 */
export abstract class BaseSceneElementModel {
  layout_data?: any;
  key = `sceneElement_${crypto.randomUUID()}`;

  private _reactComponent?: React.FC<any>;

  get reactComponent(): React.FC<any> | undefined {
    return this._reactComponent;
  }

  set reactComponent(c: React.FC<any> | undefined) {
    this._reactComponent = c;
  }

  abstract get props(): BaseSceneObjectProps;
}

// ============================================================================
// Base Widget Element
// ============================================================================

/**
 * Base class for all widgets (static + ControllerKind-based).
 * Provides geometry, data binding, and optional React component.
 */
export abstract class BaseWidgetElementModel<
  PropsType extends BaseWidgetProps = BaseWidgetProps
> extends BaseSceneElementModel {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  keys?: string[]; //data connector
  parent_component?: BaseControllerKind;

  abstract get props(): PropsType;
}

// ============================================================================
// Base Shape Element
// ============================================================================

/**
 * Base class for all shape primitives (lines, rectangles, polygons, etc.)
 */
export abstract class BaseShapeElementModel<
  PropsType extends BaseShapeProps = BaseShapeProps
> extends BaseSceneElementModel {
  stroke = "none";
  stroke_opacity = 1.0;
  stroke_linecap: "butt" | "square" | "round" = "butt";
  stroke_dashoffset = 0.0;
  stroke_width = 1.0;
  stroke_dasharray: number[] = [];
  stroke_style = 1; // Qt pen style (1 = solid)
  stroke_linejoin: "miter" | "round" | "bevel" = "miter";
  stroke_miterlimit = 4.0;
  fill = "none";
  fill_opacity = 1.0;

  abstract get props(): PropsType;
}

// ============================================================================
// Base Layout Element
// ============================================================================

/**
 * Base class for all layout containers (Fixed, Grid, Box, etc.)
 * Handles child management utilities.
 */
export abstract class BaseLayoutElementModel<
  PropsType extends BaseLayoutProps = BaseLayoutProps
> extends BaseSceneElementModel {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  children: BaseSceneElementModel[] = [];

  abstract get props(): PropsType;

  /**
   * Add a child element to the layout.
   */
  addChild(child: BaseSceneElementModel): void {
    this.children.push(child);
  }

  /**
   * Remove a child element from the layout.
   */
  removeChild(child: BaseSceneElementModel): void {
    const index = this.children.indexOf(child);
    if (index > -1) this.children.splice(index, 1);
  }

  /**
   * Get all children of a specific type.
   */
  getChildrenByType<T extends BaseSceneElementModel>(
    constructor: new (...args: any[]) => T
  ): T[] {
    return this.children.filter(
      (child): child is T => child instanceof constructor
    );
  }
}

// ============================================================================
// Base Controller Widget Model
// ============================================================================

/**
 * Abstract base class for all controller widgets (Display*, Editable*, etc.)
 * Provides data-binding (keys) and shared text styling.
 */
export abstract class BaseControllerWidgetModel<
  PropsType extends BaseWidgetProps = BaseWidgetProps
> extends BaseWidgetElementModel<PropsType> {
  /** Data-binding keys associated with the widget. */
  keys: string[] = [];

  /** Common text styling for display/edit widgets. */
  font_size: number | string = FONT_BASE_SIZE;
  font_weight: "normal" | "bold" = "normal";

  /**
   * Set one or more data-binding keys.
   */
  setKeys(keys: string | string[]): void {
    this.keys = Array.isArray(keys) ? keys : [keys];
  }

  /**
   * Add a new data-binding key (if it doesn’t already exist).
   */
  addKey(key: string): void {
    if (!this.keys.includes(key)) {
      this.keys.push(key);
    }
  }

  /**
   * Remove a data-binding key.
   */
  removeKey(key: string): void {
    this.keys = this.keys.filter((k) => k !== key);
  }

  /**
   * Get the first key in the binding list (if any).
   */
  getFirstKey(): string | undefined {
    return this.keys[0];
  }
}
