import React from "react";
import type { DisplayStateColorProps } from "@/scene/scene_types/controllers";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useDeviceProperty } from "@/components/shared/hooks/useDeviceProperty";
import { useGuiStateColor } from "@/components/shared/hooks/useGuiStateColor";

const DisplayStateColor: React.FC<DisplayStateColorProps> = React.memo(
  ({ keys, x, y, width, height, font_size, font_weight, show_string }) => {
    const primaryKey = keys[0] ?? ""; // e.g. "Test/mdl.state"

    const { deviceState, isOnlineLike, isReady } =
      useDeviceProperty(primaryKey);

    const rawState = deviceState ?? "UNKNOWN";

    // Map state string → CSS color
    const { colorValue } = useGuiStateColor(rawState);
    const bgColor = colorValue ?? "#cccccc";

    // Only show text when device is online-ish and has schema+config
    const showText = show_string && isOnlineLike && isReady;

    return (
      <ControllerContainer
        keys={keys}
        x={x}
        y={y}
        width={width}
        height={height}
        // 'state' isn't a normal schema property, so don't show '??'
        showMissingPropertyOverlay={false}
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
            backgroundColor: bgColor,
          }}
        >
          {showText && (
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
