/**
 * Base model classes for the Karabo scene system.
 */

import { FONT_DEFAULT, FONT_SIZE_DEFAULT } from './constants';

import { BaseProjectObjectModel, BaseSavableModel } from '../api';

// BaseLayoutData
//

/** Layout metadata attached to a child's `layout_data` property. */
export class BaseLayoutData extends BaseSavableModel {}

/** Position and size when placed inside a FixedLayout. */
export class FixedLayoutChildData extends BaseLayoutData {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
}

/** Grid cell placement when inside a GridLayout. */
export class GridLayoutChildData extends BaseLayoutData {
  row = 0;
  col = 0;
  rowspan = 1;
  colspan = 1;
}

// BaseSceneObjectData
//

/** Base class for everything that can appear in a scene. */
export abstract class BaseSceneObjectData extends BaseProjectObjectModel {
  /** Positioning metadata set by the parent layout (if any). */
  layout_data?: BaseLayoutData;
}

// BaseLayoutModel
//

/** Base class for layout containers (Box, Fixed, Grid). */
export abstract class BaseLayoutModel extends BaseSceneObjectData {
  x = 0;
  y = 0;
  width = 0;
  height = 0;

  /** Ordered list of child scene elements inside 'this' layout. */
  children: BaseSceneObjectData[] = [];

  addChild(child: BaseSceneObjectData): void {
    this.children.push(child);
  }

  removeChild(child: BaseSceneObjectData): void {
    const childIndex = this.children.indexOf(child);
    const childExists = childIndex !== -1;
    if (childExists) this.children.splice(childIndex, 1);
  }

  /** Filter children by model type (e.g. get all shapes). */
  getChildrenByType<T extends BaseSceneObjectData>(
    targetModel: new (...args: unknown[]) => T
  ): T[] {
    return this.children.filter(
      (child): child is T => child instanceof targetModel
    );
  }
}

// BaseShapeObjectData
//

/** Base class for shape primitives. Purely visual, no data bindings. */
export abstract class BaseShapeObjectData extends BaseSceneObjectData {
  stroke = 'none';
  stroke_opacity = 1.0;
  stroke_linecap: 'butt' | 'square' | 'round' = 'butt';
  stroke_dashoffset = 0.0;
  stroke_width = 1.0;
  stroke_dasharray: number[] = [];
  stroke_style = 1;
  stroke_linejoin: 'miter' | 'round' | 'bevel' = 'miter';
  stroke_miterlimit = 4.0;

  fill = 'none';
  fill_opacity = 1.0;
}

// BaseWidgetObjectData
//

/** Base class for all widgets. Matches Python Karabo field names. */
export abstract class BaseWidgetObjectData extends BaseSceneObjectData {
  /** Widget type name (from krb:widget). e.g. "DisplayLabel", "Label" */
  klass = '';

  /** Display vs Editable mode (from krb:class). */
  parent_component = 'DisplayComponent';

  /** Device property paths for data binding (from krb:keys). */
  keys: string[] = [];

  x = 0;
  y = 0;
  width = 0;
  height = 0;
}

// BaseLabelModel
//

/** Intermediate class for widgets that display text. */
export abstract class BaseLabelModel extends BaseWidgetObjectData {
  font_size: number = FONT_SIZE_DEFAULT;
  font_weight: 'normal' | 'bold' = 'normal';
}

// BaseEditWidget
//

/** Base class for editable widgets. */
export abstract class BaseEditWidget extends BaseWidgetObjectData {
  parent_component = 'EditableApplyLaterComponent';
}

// BaseDisplayEditableWidget
//

/**
 * Base class for dual-mode widgets that can be either display or editable,
 * resolved at build time from the klass name.
 */
export abstract class BaseDisplayEditableWidget extends BaseWidgetObjectData {}

// BaseGraphElementModel
//

/** Base for graph widgets (trend, vector). Centralizes axis and range config. */
export abstract class BasePlotModel extends BaseWidgetObjectData {
  parent_component = 'DisplayComponent';

  x_label = '';
  y_label = '';
  x_units = '';
  y_units = '';

  x_grid = false;
  y_grid = false;
  x_log = false;
  y_log = false;
  x_invert = false;
  y_invert = false;

  x_min = 0;
  x_max = 0;
  y_min = 0;
  y_max = 0;
  x_autorange = true;
  y_autorange = true;

  title = '';
  background = 'transparent';
}

// BaseLinkModel
// ----------------------------------------------------------------------------

/** Base for all link widgets. Holds label, font, and colors. */
export abstract class BaseLinkModel extends BaseWidgetObjectData {
  target = '';
  text = '';
  font: string = FONT_DEFAULT;
  foreground = '';
  background = 'transparent';
  frame_width = 1;
}

// XMLElementModel
//

/** Raw SVG elements that don't fit other categories. */
export abstract class XMLElementModel extends BaseSceneObjectData {
  id: string;

  constructor() {
    super();
    this.id = this.generateId();
  }

  protected generateId(): string {
    return `unknown_${crypto.randomUUID()}`;
  }

  resetId(): void {
    this.id = this.generateId();
  }
}

// UnknownWidgetDataModel
//

/** Catch-all for widgets with unrecognized krb:widget or krb:class. */
export class UnknownWidgetDataModel extends BaseWidgetObjectData {
  /** All raw attributes from the JSON element, preserved for round-trip. */
  attributes: Record<string, unknown> = {};
}

// UnknownXMLDataModel
//

/** Catch-all for unrecognized SVG elements (no krb: attributes). */
export class UnknownXMLDataModel extends XMLElementModel {
  tag = '';
  attributes: Record<string, string> = {};
  children: BaseSceneObjectData[] = [];
}
