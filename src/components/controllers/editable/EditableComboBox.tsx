import * as React from "react";
import type { EditableComboBoxProps } from "@/scene/scene_types/controllers";
import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "@/components/shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/QtFontDescriptor";

/**
 * EditableComboBox - Dropdown input widget for selecting a value from a set.
 * Derived from the new EditableComboBoxModel type.
 */
const EditableComboBox: React.FC<EditableComboBoxProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  // Join keys for compatibility with hooks
  const joinedKeys = useKaraboKeysString(keys);
  const { deviceId, property } = useKaraboPropertyInfo(joinedKeys);
  const offline = useDeviceOnlineStatus(deviceId);

  const placeholderOptions = ["a", "b", "c", "d", "e"];
  const [value, setValue] = React.useState<string | undefined>(undefined);

  // TODO: Replace placeholder options with websocket-provided ones later
  const options = React.useMemo(() => placeholderOptions, [property]);

  // Sync with property changes
  React.useEffect(() => {
    if (!property) {
      setValue(undefined);
      return;
    }
    const incoming = String(
      property.value ?? property.schemaAttrs?.defaultValue ?? ""
    );
    setValue(options.includes(incoming) ? incoming : undefined);
  }, [property, options]);

  // Show offline overlay when device is not connected
  if (offline) {
    return (
      <DeviceOfflineOverlay
        keys={keys}
        x={x}
        y={y}
        width={width}
        height={height}
        key={`overlay-${joinedKeys}`}
      />
    );
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value || undefined;
        setValue(v);
        // TODO: push value to backend or GUI server via WebSocket
      }}
      className="absolute border border-solid text-black rounded"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        left: `${x}px`,
        top: `${y}px`,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: font_size,
        fontWeight: font_weight.toLowerCase(),
      }}
    >
      <option value="" disabled>
        Select an option
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
};

export default EditableComboBox;
