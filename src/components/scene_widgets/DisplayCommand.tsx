import * as React from "react";
import { Button } from "@/components/ui/button";
import { DisplayCommandElementProps } from "../../karabo_data/SceneElements";
import { splitKaraboKeys } from "./shared/helpers/splitKaraboKeys";
import { DeviceSchemaConnector } from "@/karabo_connectors/DeviceSchemaConnector";
import { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";

const DisplayCommand: React.FC<DisplayCommandElementProps> = (props) => {
  const { deviceId, propertyId } = React.useMemo(
    () => splitKaraboKeys(props.karaboKeys),
    [props.karaboKeys]
  );

  const [buttonCaption, setButtonCaption] = React.useState<string>(propertyId);

  const onSchemaUpdate = React.useCallback(
    (deviceSchema: DeviceSchemaInfo) => {
      if (deviceSchema.deviceId === deviceId) {
        const propAttrs = deviceSchema.propertyDescriptors.get(propertyId);
        if (propAttrs !== undefined) {
          setButtonCaption(propAttrs.displayedName);
        }
      }
    },
    [deviceId, propertyId]
  );

  React.useEffect(() => {
    DeviceSchemaConnector.inst.registerSchemaMonitor(deviceId, onSchemaUpdate);
    return () => {
      DeviceSchemaConnector.inst.unregisterSchemaMonitor(
        deviceId,
        onSchemaUpdate
      );
    };
  }, [deviceId, propertyId, onSchemaUpdate]);

  return (
    <Button
      size="sm"
      className="absolute border-2 border-gray-300 bg-primary/80 px-2"
      style={{
        width: props.width,
        height: props.height,
        left: props.x,
        top: props.y,
        fontFamily: "Arial, Helvetica, Sans-serif",
        fontSize: 11,
        fontWeight: "bolder",
      }}
    >
      {buttonCaption}
    </Button>
  );
};

export default DisplayCommand;
