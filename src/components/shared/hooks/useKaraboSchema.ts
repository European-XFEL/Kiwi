import * as React from "react";
import { DeviceSchemaConnector } from "@/karabo_connectors/DeviceSchemaConnector";
import { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";
import { splitKaraboKeys } from "@/components/shared/helpers/splitKaraboKeys";

/**
 * Hook that subscribes to schema updates for a given Karabo key.
 * Returns the current DeviceSchemaInfo (or null until available).
 */
export function useKaraboSchema(karaboKeys: string) {
  const { deviceId, propertyId } = React.useMemo(
    () => splitKaraboKeys(karaboKeys),
    [karaboKeys]
  );

  const [schema, setSchema] = React.useState<DeviceSchemaInfo | null>(null);

  const handleSchemaUpdate = React.useCallback(
    (deviceSchema: DeviceSchemaInfo) => {
      if (deviceSchema.deviceId === deviceId) {
        setSchema(deviceSchema);
      }
    },
    [deviceId]
  );

  React.useEffect(() => {
    DeviceSchemaConnector.inst.registerSchemaMonitor(
      deviceId,
      handleSchemaUpdate
    );

    return () => {
      DeviceSchemaConnector.inst.unregisterSchemaMonitor(
        deviceId,
        handleSchemaUpdate
      );
    };
  }, [deviceId, handleSchemaUpdate]);

  return {
    schema,
    deviceId,
    propertyId,
    propertyDescriptor:
      schema?.propertyDescriptors.get(propertyId) ?? undefined,
  };
}
