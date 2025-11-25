import { DeviceStatus, ProxyStatus } from "./types";
import type { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";

export function computePropertyOverlayStatus(
  device: DeviceStatus | null | undefined,
  schema: DeviceSchemaInfo | null | undefined,
  propertyId: string
): ProxyStatus {
  // No device info → don't guess
  if (!device) {
    return ProxyStatus.NONE;
  }

  // If schema was not yet received or not stored → we can't say it's missing
  const schemaReceived = device.schema_status.received_device_schema;
  if (!schemaReceived || !schema) {
    return ProxyStatus.NONE;
  }

  const descriptors = schema.propertyDescriptors;

  // propertyDescriptors can be a Map or an object depending on the decoder
  let exists = false;
  if (descriptors instanceof Map) {
    exists = descriptors.has(propertyId);
  } else if (descriptors && typeof descriptors === "object") {
    exists = Object.prototype.hasOwnProperty.call(descriptors, propertyId);
  }

  return exists ? ProxyStatus.NONE : ProxyStatus.MISSING;
}
