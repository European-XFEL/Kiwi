import * as React from "react";
import { DevicePropertyConnector } from "../../../../karabo_connectors/DevicePropertyConnector";
import { splitKaraboKeys } from "../../shared/helpers/splitKaraboKeys";

export function useKaraboProperty(
  karaboKeys: string,
  initial: unknown = "UNKNOWN"
) {
  const { deviceId, propertyId } = React.useMemo(
    () => splitKaraboKeys(karaboKeys),
    [karaboKeys]
  );

  const [value, setValue] = React.useState<unknown>(initial);

  const onUpdate = React.useCallback((v: unknown) => setValue(v), []);

  React.useEffect(() => {
    DevicePropertyConnector.inst.registerPropertyMonitor(
      deviceId,
      propertyId,
      onUpdate
    );
    return () => {
      DevicePropertyConnector.inst.unregisterPropertyMonitor(
        deviceId,
        propertyId,
        onUpdate
      );
    };
  }, [deviceId, propertyId, onUpdate]);

  return { deviceId, propertyId, value };
}
