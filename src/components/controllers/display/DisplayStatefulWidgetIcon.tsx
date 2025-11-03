import React from "react";
import type { DisplayStatefulIconProps } from "@/scene/scene_types/controllers";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useGuiStateColor } from "../../shared/hooks/useGuiStateColor";
import { useDeviceOnlineStatus } from "../../shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import DeviceOfflineOverlay from "../../DeviceOfflineOverlay";
import { getIconPaths, getPrimaryIconPath } from "@/shared/helpers/getIconPath";
import { loadAndRecolorSvg } from "../../shared/helpers/loadAndRecolor";

/**
 * DisplayStatefulIcon - Displays a dynamic icon that changes color/state
 * based on a device property value. Uses the new model-based architecture.
 */
const DisplayStatefulIcon: React.FC<DisplayStatefulIconProps> = (props) => {
  const { keys, x, y, width, height, icon_name } = props;

  // Join keys array for hook compatibility
  const joinedKeys = useKaraboKeysString(keys);
  const { deviceId, property } = useKaraboPropertyInfo(joinedKeys);
  const isOffline = useDeviceOnlineStatus(deviceId);

  // Local state
  const [svgContent, setSvgContent] = React.useState("");
  const [currentIconIndex, setCurrentIconIndex] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);

  // Extract and convert device state
  const rawState = property ? String(property.value) : "UNKNOWN";
  const { colorValue } = useGuiStateColor(rawState);

  // Get potential icon paths
  const iconPaths = React.useMemo(
    () =>
      getIconPaths({
        krbClass: "DisplayComponent",
        widget: "StatefulIconWidget",
        iconName: icon_name,
      }),
    [icon_name]
  );

  const currentIconPath = hasError
    ? getPrimaryIconPath({
        krbClass: "DisplayComponent",
        widget: "StatefulIconWidget",
        iconName: "no_icon",
      })
    : iconPaths[currentIconIndex];

  // Load and recolor SVG dynamically
  React.useEffect(() => {
    if (!currentIconPath.endsWith(".svg")) {
      setSvgContent("");
      return;
    }

    const controller = new AbortController();

    loadAndRecolorSvg(
      currentIconPath,
      colorValue,
      {
        stroke: false,
        fit: "contain",
        nonScalingStroke: false,
        enablePerfTracking: true,
      },
      controller.signal
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setSvgContent(result.svg);

          if (result.metrics && process.env.NODE_ENV === "development") {
            const { computationTime, renderingTime } = result.metrics;
            const total = (computationTime ?? 0) + (renderingTime ?? 0);
            if (total > 50) {
              console.warn(
                `[SVG Performance Warning] ${icon_name} took ${total.toFixed(
                  2
                )}ms`,
                result.metrics
              );
            }
          }
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.warn(`Failed to load SVG: ${currentIconPath}`, err);
        if (currentIconIndex < iconPaths.length - 1) {
          setCurrentIconIndex((i) => i + 1);
        } else {
          console.error(`All icon formats failed for: ${icon_name}`);
          setHasError(true);
        }
      });

    return () => controller.abort();
  }, [currentIconPath, colorValue, currentIconIndex, iconPaths, icon_name]);

  // Reset state on icon change
  React.useEffect(() => {
    setCurrentIconIndex(0);
    setHasError(false);
  }, [icon_name]);

  return (
    <figure
      className="absolute m-0 overflow-hidden"
      style={{
        left: x,
        top: y,
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      role="img"
      aria-label={`${icon_name} - ${rawState}`}
    >
      {isOffline ? (
        <DeviceOfflineOverlay
          keys={keys}
          x={x}
          y={y}
          width={width}
          height={height}
          key={`overlay-${joinedKeys}`}
        />
      ) : svgContent ? (
        <div
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ width: "100%", height: "100%", lineHeight: 0 }}
        />
      ) : (
        <img
          src={currentIconPath}
          alt={`${icon_name} - ${rawState}`}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      )}
    </figure>
  );
};

export default DisplayStatefulIcon;
