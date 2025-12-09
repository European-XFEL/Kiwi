import type { BaseWidgetProps, BaseControllerKind } from "./base";
import type { ProxyStatus } from "@/device/enums";
import type { UseDevicePropertyResult } from "@/components/shared/hooks/useDeviceProperty";

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
  font_weight?: "normal" | "bold";

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
