import React from "react";
import { DeviceSchemaConnector } from "@/karabo_connectors/DeviceSchemaConnector";
import type { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";

import { splitKaraboKeys } from "@/components/shared/helpers/splitKaraboKeys";
import { useDeviceStatus } from "@/store/useDeviceStatusStore";

import {
  ProxyStatus,
  PropertyLevelIndicator,
} from "@/overlay_indicator/types";

import { computePropertyOverlayStatus } from "@/overlay_indicator/property_overlay_indicator";
import { DeviceOverlayIndicator } from "@/overlay_indicator/device_overlay_indicator";

export function usePropertyLevelIndicator(karaboKeys: string) {
  const { deviceId, propertyId } = React.useMemo(
    () => splitKaraboKeys(karaboKeys),
    [karaboKeys]
  );

  const deviceStatus = useDeviceStatus(deviceId);

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

  if (!deviceId || !propertyId || !deviceStatus) {
    return null;
  }

  // **Key point**: this now only returns MISSING when schema says so
  const overlay_status: ProxyStatus =
    computePropertyOverlayStatus(deviceStatus, schema, propertyId);

  if (overlay_status === ProxyStatus.NONE) {
    return null;
  }

  const propertyLevel: PropertyLevelIndicator = {
    device_id: deviceId,
    property_id: propertyId,
    overlay_status,
  };

  return DeviceOverlayIndicator.compute_property_overlay_indicator(
    propertyLevel
  );
}
