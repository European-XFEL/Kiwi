import React from "react";
import { DisplayStatefulWidgetIconProps } from "@/karabo_data/SceneElements";
import { useKaraboPropertyInfo } from "../shared/hooks/useKaraboProperty";
import { useGuiStateColor } from "../shared/hooks/useGuiStateColor";
import { useDeviceOnlineStatus } from "../shared/hooks/useDeviceOnlineStatus";
import DeviceOfflineOverlay from "../simple/DeviceOfflineOverlay";
import { getIconPaths, getPrimaryIconPath } from "@/shared/helpers/getIconPath";
import { loadAndRecolorSvg } from "../shared/helpers/loadAndRecolor";

const DisplayStatefulWidgetIcon: React.FC<DisplayStatefulWidgetIconProps> = (
  props
) => {
  //hooks
  const { deviceId, property } = useKaraboPropertyInfo(props.karaboKeys);
  const isOffline = useDeviceOnlineStatus(deviceId);

  //states
  const [svgContent, setSvgContent] = React.useState("");
  const [currentIconIndex, setCurrentIconIndex] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);

  // Get device state and color
  const rawState = property ? String(property.value) : "UNKNOWN";
  const { colorValue } = useGuiStateColor(rawState);

  // Get icon paths
  const iconPaths = React.useMemo(
    () =>
      getIconPaths({
        krbClass: "DisplayComponent",
        widget: "StatefulIconWidget",
        iconName: props.iconName,
      }),
    [props.iconName]
  );

  const currentIconPath = hasError
    ? getPrimaryIconPath({
        krbClass: "DisplayComponent",
        widget: "StatefulIconWidget",
        iconName: "no_icon",
      })
    : iconPaths[currentIconIndex];

  // Load and recolor SVG
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
        enablePerfTracking: true, // Enable performance tracking
      },
      controller.signal
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setSvgContent(result.svg);

          // Log performance metrics in development
          if (result.metrics && process.env.NODE_ENV === "development") {
            const perfData = {
              total:
                typeof result.metrics.totalTime === "number"
                  ? `${result.metrics.totalTime.toFixed(2)}ms`
                  : "N/A",
              fetch:
                typeof result.metrics.fetchTime === "number"
                  ? `${result.metrics.fetchTime.toFixed(2)}ms`
                  : "N/A",
              computation:
                typeof result.metrics.computationTime === "number"
                  ? `${result.metrics.computationTime.toFixed(2)}ms`
                  : "N/A",
              rendering:
                typeof result.metrics.renderingTime === "number"
                  ? `${result.metrics.renderingTime.toFixed(2)}ms`
                  : "N/A",
              fromCache: result.metrics.fromCache ?? false,
            };

            // Warn if total time exceeds 50ms (excluding network fetch)
            const processingTime =
              (result.metrics.computationTime ?? 0) +
              (result.metrics.renderingTime ?? 0);
            if (processingTime > 50) {
              console.warn(
                `[SVG Performance Warning] ${
                  props.iconName
                } processing took ${processingTime.toFixed(2)}ms`,
                perfData
              );
            } else {
              console.log(`[SVG Performance] ${props.iconName}:`, perfData);
            }
          }
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;

        console.warn(`Failed to load SVG: ${currentIconPath}`, err);

        // Try next format
        if (currentIconIndex < iconPaths.length - 1) {
          setCurrentIconIndex((i) => i + 1);
        } else {
          console.error(`All icon formats failed for: ${props.iconName}`);
          setHasError(true);
        }
      });

    return () => controller.abort();
  }, [
    currentIconPath,
    colorValue,
    currentIconIndex,
    iconPaths,
    props.iconName,
  ]);

  // Reset on icon change
  React.useEffect(() => {
    setCurrentIconIndex(0);
    setHasError(false);
  }, [props.iconName]);

  return (
    <figure
      className="absolute m-0 overflow-hidden z-10"
      style={{
        left: props.x,
        top: props.y,
        width: props.width,
        height: props.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      role="img"
      aria-label={`${props.iconName} - ${rawState}`}
    >
      {isOffline ? (
        <DeviceOfflineOverlay {...props} />
      ) : svgContent ? (
        <div
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{
            width: "100%",
            height: "100%",
            lineHeight: 0,
          }}
        />
      ) : (
        <img
          src={currentIconPath}
          alt={`${props.iconName} - ${rawState}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      )}
    </figure>
  );
};

export default DisplayStatefulWidgetIcon;
