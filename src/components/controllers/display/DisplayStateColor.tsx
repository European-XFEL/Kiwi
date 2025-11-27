import React from "react";
import type { DisplayStateColorProps } from "@/scene/scene_types/controllers";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useGuiStateColor } from "../../shared/hooks/useGuiStateColor";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { TopologyConnector } from "@/karabo_connectors/TopologyConnector";

const DisplayStateColor: React.FC<DisplayStateColorProps> = React.memo(
  ({ keys, x, y, width, height, font_size, font_weight, show_string }) => {
    const keysStr = useKaraboKeysString(keys);
    const { property } = useKaraboPropertyInfo(keysStr);

    const rawState = React.useMemo(
      () => String((property as PropertyInfo)?.value ?? "UNKNOWN"),
      [(property as PropertyInfo)?.value]
    );

    const { colorValue } = useGuiStateColor(rawState);

    //Important: detect device online/offline
    const deviceId = keys[0].split(".")[0];
    const isOnline = TopologyConnector.inst.isDeviceOnline(deviceId);

    return (
      <ControllerContainer
        keys={keys}
        x={x}
        y={y}
        width={width}
        height={height}
        showMissingPropertyOverlay
        className="flex items-center justify-center border border-solid overflow-hidden p-0.5"
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial",
            fontSize: font_size,
            fontWeight: font_weight,
            backgroundColor: colorValue,
          }}
        >
          {/*Hide text when offline */}
          {show_string && isOnline && (
            <span className="text-xs" aria-live="polite">
              {rawState}
            </span>
          )}
        </div>
      </ControllerContainer>
    );
  }
);

export default DisplayStateColor;
