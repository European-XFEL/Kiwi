import React from "react";
import { DisplayStatefulWidgetIconProps } from "@/karabo_data/SceneElements";
import { splitKaraboKeys } from "./shared/helpers/splitKaraboKeys";
import { useKaraboPropertyInfo } from "./shared/hooks/useKaraboProperty";
import { useGuiStateColor } from "./displayStateColor/hooks/useGuiStateColor";
import DeviceOfflineOverlay from "./DeviceOfflineOverlay";
import { TopologyConnector } from "@/karabo_connectors/TopologyConnector";
import { DeviceInfo, TopologyEventType } from "@/karabo_data/TopologyInfo";
import { getIconPaths, getPrimaryIconPath } from "@/shared/helpers/getIconPath";
import { loadAndRecolorSvg } from "./shared/helpers/loadAndRecolor";

const DisplayStatefulWidgetIcon: React.FC<DisplayStatefulWidgetIconProps> = (
  props
) => {
  const { deviceId } = React.useMemo(
    () => splitKaraboKeys(props.karaboKeys),
    [props.karaboKeys]
  );

  const [isOffline, setIsOffline] = React.useState(
    !TopologyConnector.inst.isDeviceOnline(deviceId)
  );
  const [svgContent, setSvgContent] = React.useState("");
  const [currentIconIndex, setCurrentIconIndex] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);

  // Get device state and color
  const { property } = useKaraboPropertyInfo(props.karaboKeys);
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
      },
      controller.signal
    )
      .then((recolored) => {
        if (!controller.signal.aborted) {
          setSvgContent(recolored);
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

  // Monitor device status
  const onDeviceInfoUpdate = React.useCallback(
    (eventType: TopologyEventType, deviceInfo: DeviceInfo) => {
      if (deviceInfo.deviceId !== deviceId) {
        console.error(
          `Topology routing error: expected ${deviceId}, got ${deviceInfo.deviceId}`
        );
        return;
      }
      setIsOffline(eventType === TopologyEventType.GONE);
    },
    [deviceId]
  );

  React.useEffect(() => {
    TopologyConnector.inst.registerDeviceInfoMonitor(
      deviceId,
      onDeviceInfoUpdate
    );
    return () => {
      TopologyConnector.inst.unregisterDeviceInfoMonitor(
        deviceId,
        onDeviceInfoUpdate
      );
    };
  }, [deviceId, onDeviceInfoUpdate]);

  return (
    <figure
      className="absolute m-0 overflow-hidden"
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
