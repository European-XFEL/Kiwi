import {
  DEVICE_INDICATORS,
  PROPERTY_MISSING_INDICATOR,
} from "./overlay_indicator_constants";
import {
  type DeviceStatus,
  PropertyLevelIndicator,
  DeviceProxy,
  ProxyStatus,
  DeviceIndicatorDescriptor,
  PropertyIndicatorDescriptor,
} from "./types";

export class DeviceOverlayIndicator {
  /**
   * PURE POLICY:
   * Given the raw DeviceStatus, decide the overlay enum.
   */
  static compute_device_overlay_status(state: DeviceStatus): DeviceProxy {
    const { topology_status, schema_status, config_status } = state;

    if (!topology_status.is_device_online) {
      return DeviceProxy.OFFLINE;
    }

    if (
      schema_status.requested_device_schema &&
      !schema_status.received_device_schema
    ) {
      return DeviceProxy.SCHEMA_REQUESTED;
    }

    if (schema_status.received_device_schema && !config_status.has_config) {
      return DeviceProxy.SCHEMA_RECEIVED;
    }

    return DeviceProxy.MONITORING;
  }

  /**
   * UI helper: map current overlay_status → descriptor (for legends / badges).
   */
  static compute_device_overlay_indicator(
    state: DeviceStatus
  ): DeviceIndicatorDescriptor | null {
    const descriptor = DEVICE_INDICATORS.find(
      (d) => d.status === state.overlay_status
    );

    return descriptor ?? null;
  }

  /**
   * UI helper for properties: "??" when missing, nothing otherwise.
   */
  static compute_property_overlay_indicator(
    state: PropertyLevelIndicator
  ): PropertyIndicatorDescriptor | null {
    if (state.overlay_status === ProxyStatus.NONE) {
      return null;
    }

    if (state.overlay_status === ProxyStatus.MISSING) {
      return PROPERTY_MISSING_INDICATOR;
    }

    return null;
  }
}
