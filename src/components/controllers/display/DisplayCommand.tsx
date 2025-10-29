import * as React from "react";
import { Button } from "@/components/ui/button";
import { DisplayCommandElementProps } from "../../../karabo_data/SceneElements";
import { useDeviceOnlineStatus } from "../../shared/hooks/useDeviceOnlineStatus";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import DeviceOfflineOverlay from "../../DeviceOfflineOverlay";

const DisplayCommand: React.FC<DisplayCommandElementProps> = (props) => {
  const { deviceId, propertyId, property } = useKaraboPropertyInfo(
    props.karaboKeys
  );
  const isOffline = useDeviceOnlineStatus(deviceId);

  const buttonCaption = React.useMemo(() => {
    if (!property?.schemaAttrs) return propertyId;
    return property.schemaAttrs.displayedName;
  }, [property, propertyId]);

  if (isOffline) {
    return <DeviceOfflineOverlay {...props} />;
  }

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
