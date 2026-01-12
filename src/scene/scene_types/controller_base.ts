import type { BaseWidgetProps, BaseControllerKind } from './base';
import type { ProxyStatus } from '@/binding';
import type { UseDevicePropertyResult } from '@/binding';

/**
 * Base props for all controller widgets.
 * Includes:
 *  - "data props" from scene file
 *  - "runtime injected props" from the container
 *
 * Runtime props are optional so model.props remains clean.
 */
export interface BaseControllerWidgetProps extends BaseWidgetProps {
  parent_component?: BaseControllerKind;

  keys: string[];

  font_size?: number | string;
  font_weight?: 'normal' | 'bold';

  // ─── Runtime injected (from ControllerContainer) ───
  canEdit?: boolean;
  isEnabled?: boolean;
  disabledReason?: string;
  tooltipText?: string;

  proxyStatus?: ProxyStatus;
  propertyMissing?: boolean;
  hasPendingEdits?: boolean;

  /**
   * OPTIMIZATION: Full device property data injected by container.
   * When present, components should use this instead of calling useDeviceProperty.
   * This prevents duplicate hook calls and improves performance.
   */
  primary?: UseDevicePropertyResult;

  /**
   * Optional passthrough:
   * some widgets may want overlay behavior toggled per type.
   */
  showMissingPropertyOverlay?: boolean;
}

/**
 * Base props for all graph-like widgets (trends, vectors, etc.).
 * Centralizes axis configuration, ranges, and visual properties.
 */
export interface BaseGraphProps extends BaseControllerWidgetProps {
  parent_component: 'DisplayComponent';

  // Axis labels & units
  x_label: string;
  y_label: string;
  x_units: string;
  y_units: string;

  // Axis behavior
  x_grid: boolean;
  y_grid: boolean;
  x_log: boolean;
  y_log: boolean;
  x_invert: boolean;
  y_invert: boolean;

  // Axis ranges
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  x_autorange: boolean;
  y_autorange: boolean;

  // Visual
  title: string;
  background: string;
  plot_engine?: 'plotly' | 'echarts';
}
