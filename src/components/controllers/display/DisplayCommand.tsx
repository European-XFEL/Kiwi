import React from "react";
import type { DisplayCommandProps } from "@/scene/scene_types/controllers";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "../../shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import { Button } from "@/components/ui/button";
import DeviceOfflineOverlay from "../../DeviceOfflineOverlay";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";

/**
 * DisplayCommand (read-only)
 * Renders a disabled button reflecting the associated device command.
 */
const DisplayCommand: React.FC<DisplayCommandProps> = ({
  keys,
  x,
  y,
  width,
  height,
  font_size,
  font_weight,
  requires_confirmation,
}) => {
  // Join keys for Karabo hook
  const keysStr = useKaraboKeysString(keys);

  const { deviceId, propertyId, property } = useKaraboPropertyInfo(keysStr);
  const isOffline = useDeviceOnlineStatus(deviceId);

  // Resolve button label from property schema or fallback to propertyId
  const buttonCaption = React.useMemo(() => {
    const name = property?.schemaAttrs?.displayedName;
    return name || propertyId;
  }, [property?.schemaAttrs?.displayedName, propertyId]);

  // Render offline overlay if device is disconnected
  if (isOffline) {
    return (
      <DeviceOfflineOverlay
        keys={keys}
        x={x}
        y={y}
        width={width}
        height={height}
      />
    );
  }

  return (
    <Button
      size="sm"
      disabled
      aria-label={`Display command for ${keys.join(", ")}`}
      className="absolute border-2 border-gray-300 bg-primary/80 px-2"
      style={{
        left: x,
        top: y,
        width,
        height,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: font_size,
        fontWeight: font_weight,
      }}
    >
      {requires_confirmation ? `${buttonCaption} (Confirm)` : buttonCaption}
    </Button>
  );
};

export default DisplayCommand;
