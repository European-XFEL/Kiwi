import * as React from "react";
import { DevicePropertyConnector } from "@/karabo_connectors/DevicePropertyConnector";
import { splitKaraboKeys } from "@/components/shared/helpers/splitKaraboKeys";
import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { VectorElementType } from "@/karabo_hash/HashValueType";

export function useKaraboPropertyInfo(karaboKeys: string) {
  const { deviceId, propertyPath } = React.useMemo(
    () => splitKaraboKeys(karaboKeys),
    [karaboKeys]
  );

  const [property, setProperty] = React.useState<
    PropertyInfo | VectorElementType[][] | null
  >(null);

  const onUpdate = React.useCallback(
    (p: PropertyInfo | VectorElementType[][]) => {
      setProperty(p);
    },
    []
  );

  React.useEffect(() => {
    DevicePropertyConnector.inst.registerPropertyMonitor(
      deviceId,
      propertyPath,
      onUpdate
    );
    return () => {
      DevicePropertyConnector.inst.unregisterPropertyMonitor(
        deviceId,
        propertyPath,
        onUpdate
      );
    };
  }, [deviceId, propertyPath, onUpdate]);

  return { deviceId, propertyPath, property };
}
