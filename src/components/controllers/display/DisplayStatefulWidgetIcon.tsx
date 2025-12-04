import React, { useMemo } from "react";
import type { DisplayStatefulIconProps } from "@/scene/scene_types/controllers";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useDeviceProperty } from "../../shared/hooks/useDeviceProperty";
import { useGuiStateColor } from "../../shared/hooks/useGuiStateColor";
import { statefulIconTextById } from "@/components/shared/helpers/statefulIcons";
import {
  recolorPreloadedSvg,
  getPreloadedCacheKey,
} from "@/components/shared/helpers/loadAndRecolor";

const DisplayStatefulIcon: React.FC<DisplayStatefulIconProps> = (props) => {
  const { keys, x, y, width, height, icon_name } = props;

  const primaryKey = keys[0] ?? "";
  const { value } = useDeviceProperty(primaryKey);

  // Map the property value (e.g., "ON", "ACTIVE") to a color
  const rawState = value ? String(value) : "UNKNOWN";
  const { colorValue } = useGuiStateColor(rawState);

  //  if the module wasn't mocked correctly
  const svgXML = statefulIconTextById?.[icon_name] ?? null;

  const recoloredSvg = useMemo(() => {
    if (!svgXML) return "";

    const cacheKey = getPreloadedCacheKey(icon_name, colorValue, {
      stroke: true,
      fit: "contain",
      nonScalingStroke: false,
    });

    const recolorResult = recolorPreloadedSvg(svgXML, colorValue, cacheKey, {
      stroke: true,
      fit: "contain",
      nonScalingStroke: false,
      enablePerfTracking: true,
    });

    console.log(
      `[DisplayStatefulIcon] ${icon_name} | ${
        recolorResult.metrics?.fromCache ? "CACHE HIT " : "CACHE MISS "
      }`
    );

    return recolorResult.svg;
  }, [svgXML, colorValue, icon_name]);

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      showMissingPropertyOverlay
      className="flex items-center justify-center"
    >
      {recoloredSvg ? (
        <div
          style={{ width: "100%", height: "100%" }}
          dangerouslySetInnerHTML={{ __html: recoloredSvg }}
        />
      ) : (
        // fallback only runs if svgXML was missing
        <svg width="100%" height="100%" viewBox="0 0 120 30">
          <text x="0" y="20" fontSize="10">
            {icon_name}
          </text>
        </svg>
      )}
    </ControllerContainer>
  );
};

export default DisplayStatefulIcon;
