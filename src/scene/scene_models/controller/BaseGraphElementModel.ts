/**
 * BaseGraphElementModel
 *
 * Shared base model for all graph-like widgets (trends, vectors, etc.).
 * Centralizes common graph properties:
 * - Axis labels, units, behaviors (grid, log, invert)
 * - Axis ranges (min, max, autorange)
 * - Visual properties (title, background, plot_engine)
 *
 * Architecture:
 * - Extends BaseControllerContainerModel for data binding
 * - Provides getBaseGraphProps() helper for DRY props assembly
 * - Both DisplayTrendGraph and Vector* graphs extend this
 */

import { BaseControllerContainerModel } from '@/scene/scene_view/controller/BaseControllerContainerModel';
import type { BaseGraphProps } from '@/scene/scene_types/controller_base';

export abstract class BaseGraphElementModel<
  PropsType extends BaseGraphProps,
> extends BaseControllerContainerModel<PropsType> {
  parent_component = 'DisplayComponent' as const;

  // ─────────────────────────────────
  // Axis labels + units
  // ─────────────────────────────────
  x_label = '';
  y_label = '';
  x_units = '';
  y_units = '';

  // ─────────────────────────────────
  // Axis behaviors
  // ─────────────────────────────────
  x_grid = false;
  y_grid = false;

  x_log = false;
  y_log = false;

  x_invert = false;
  y_invert = false;

  // ─────────────────────────────────
  // Axis ranges
  // ─────────────────────────────────
  x_min = 0;
  x_max = 0;
  y_min = 0;
  y_max = 0;

  x_autorange = true;
  y_autorange = true;

  // ─────────────────────────────────
  // Visual properties
  // ─────────────────────────────────
  title = '';
  background = 'transparent';

  // ─────────────────────────────────
  // Optional plot engine hint
  // ─────────────────────────────────
  plot_engine?: 'plotly' | 'echarts';

  /**
   * Build the shared props payload for all graph widgets.
   * Each concrete model merges this with widget-specific properties.
   */
  protected getBaseGraphProps() {
    return {
      element_type: 'widget' as const,
      parent_component: this.parent_component,

      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,

      keys: this.keys ?? [],

      font_size: this.font_size,
      font_weight: this.font_weight,

      x_label: this.x_label,
      y_label: this.y_label,
      x_units: this.x_units,
      y_units: this.y_units,

      x_grid: this.x_grid,
      y_grid: this.y_grid,
      x_log: this.x_log,
      y_log: this.y_log,
      x_invert: this.x_invert,
      y_invert: this.y_invert,

      x_min: this.x_min,
      x_max: this.x_max,
      y_min: this.y_min,
      y_max: this.y_max,

      x_autorange: this.x_autorange,
      y_autorange: this.y_autorange,

      title: this.title,
      background: this.background,

      plot_engine: this.plot_engine,

      layout_data: this.layout_data,
    };
  }
}
