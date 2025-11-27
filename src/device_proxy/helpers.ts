import {
  DEVICE_INDICATORS,
  PROPERTY_INDICATORS,
} from "./overlay_indicator_constants";
import { PropertyStatus, ProxyStatus } from "./enum";
import {
  DeviceIndicatorDescriptor,
  PropertyIndicatorDescriptor,
} from "./types";

export function getDeviceIndicator(
  status: ProxyStatus
): DeviceIndicatorDescriptor | null {
  return DEVICE_INDICATORS.find((d) => d.status === status) ?? null;
}

export function getPropertyIndicator(
  status: PropertyStatus
): PropertyIndicatorDescriptor | null {
  return PROPERTY_INDICATORS.find((d) => d.status === status) ?? null;
}
