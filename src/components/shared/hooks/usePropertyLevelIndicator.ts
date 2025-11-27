import React from "react";
import { DeviceSchemaConnector } from "@/karabo_connectors/DeviceSchemaConnector";
import type { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";

import { splitKaraboKeys } from "@/components/shared/helpers/splitKaraboKeys";
import { useDeviceProxy } from "@/store/useDeviceProxyStore";

import { PropertyStatus } from "@/device_proxy/enum";
import type { PropertyIndicatorDescriptor } from "@/device_proxy/types";
import { getPropertyIndicator } from "@/device_proxy/helpers";

export function usePropertyLevelIndicator(
  karaboKeys: string
): PropertyIndicatorDescriptor | null {
  const { deviceId, propertyId } = React.useMemo(
    () => splitKaraboKeys(karaboKeys),
    [karaboKeys]
  );

  const proxy = useDeviceProxy(deviceId);

  const [schema, setSchema] = React.useState<DeviceSchemaInfo | null>(null);

  React.useEffect(() => {
    if (!deviceId) return;

    // 1) get current schema if already cached
    const current =
      DeviceSchemaConnector.inst.getDeviceSchema?.(deviceId) ?? null;
    setSchema(current);

    // 2) subscribe to updates
    const handler = (info: DeviceSchemaInfo) => {
      if (info.deviceId === deviceId) {
        setSchema(info);
      }
    };

    DeviceSchemaConnector.inst.registerSchemaMonitor(deviceId, handler);
    return () => {
      DeviceSchemaConnector.inst.unregisterSchemaMonitor(deviceId, handler);
    };
  }, [deviceId]);

  if (!deviceId || !propertyId || !proxy) {
    return null;
  }

  // Compute property status based on schema
  let propertyStatus: PropertyStatus = PropertyStatus.NONE;

  // If we have schema, check if property exists
  if (schema && schema.propertyDescriptors) {
    const propertyExists = schema.propertyDescriptors.has(propertyId);
    propertyStatus = propertyExists
      ? PropertyStatus.NONE
      : PropertyStatus.MISSING;
  }

  // If NONE status, no overlay needed
  if (propertyStatus === PropertyStatus.NONE) {
    return null;
  }

  // Return the property indicator descriptor
  return getPropertyIndicator(propertyStatus);
}
