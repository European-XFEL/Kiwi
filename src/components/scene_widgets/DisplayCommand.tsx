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
    // TODO: register with the TopologyConnector to handle device offline events - the offline overlay must also be shown when the device that host the slot is offline.
    // TODO: subscribe to the session store to update when the user access level changes - needed to disable commands for users that are OBSERVER
    // TODO: register as a monitor to the "state" property of the device - needed to change enabled state of the button based on the state and the value of "allowed states"
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
