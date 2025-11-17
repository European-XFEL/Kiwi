import React from "react";
import type { DisplayTableElementProps } from "@/scene/scene_types/controllers/display";
import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { useDeviceOnlineStatus } from "@/components/shared/hooks/useDeviceOnlineStatus";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { useKaraboSchema } from "@/components/shared/hooks/useKaraboSchema";

/**
 * DisplayTableElement - Displays table data from a property.
 * Currently logs property data to console for debugging.
 */
const DisplayTableElement: React.FC<DisplayTableElementProps> = (props) => {
  const keysStr = useKaraboKeysString(props.keys);
  const { deviceId, property } = useKaraboPropertyInfo(keysStr);
  const { schema, propertyDescriptor } = useKaraboSchema(keysStr);
  const isOffline = useDeviceOnlineStatus(deviceId);

  // Log diagnostic info to help track why `property` may be null
  React.useEffect(() => {
    console.log("[DisplayTableElement] deviceId:", deviceId);
    console.log("[DisplayTableElement] keysStr:", keysStr);
    console.log("[DisplayTableElement] property:", property);
    console.log(
      "[DisplayTableElement] propertyDescriptor:",
      propertyDescriptor?.rowSchema
    );
    console.log("[DisplayTableElement] schema:", schema);
  }, [deviceId, keysStr, property, propertyDescriptor, schema]);

  return (
    <div
      className="absolute border border-solid overflow-auto"
      style={{
        width: props.width,
        height: props.height,
        left: props.x,
        top: props.y,
      }}
    >
      {isOffline ? (
        <DeviceOfflineOverlay
          keys={props.keys}
          x={props.x}
          y={props.y}
          width={props.width}
          height={props.height}
        />
      ) : (
        <div className="p-2 text-xs">
          <p className="font-bold mb-2">DisplayTableElement</p>
          {property ? (
            <>
              <p className="text-gray-800">
                Property value available — check console or render table here.
              </p>
              <pre className="text-xs mt-1 wrap-break-word">
                {JSON.stringify(property.value, null, 2)}
              </pre>
            </>
          ) : (
            <>
              <p className="text-gray-600">No property update yet.</p>
              <p className="text-gray-600 mt-1">Keys: {keysStr}</p>
              <p className="text-gray-600 mt-1">
                Schema descriptor:{" "}
                {propertyDescriptor
                  ? propertyDescriptor.displayedName ??
                    propertyDescriptor.nodeType ??
                    "available"
                  : "not yet available"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DisplayTableElement;
