import * as React from "react";

import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { EditableComboBoxElementProps } from "@/karabo_data/SceneElements";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "@/components/shared/hooks/useDeviceOnlineStatus";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/QtFontDescriptor";

const EditableComboBox: React.FC<EditableComboBoxElementProps> = (props) => {
  const { deviceId, property } = useKaraboPropertyInfo(props.karaboKeys);
  const offline = useDeviceOnlineStatus(deviceId);

  const placeholderOptions = ["a", "b", "c", "d", "e"];
  const [value, setValue] = React.useState<string | undefined>(undefined);

  //TODO: derive the options (replace with websocket-provided options when we have them)
  const options = React.useMemo(() => placeholderOptions, [property]);

  // update when websocket/property changes
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

  if (offline) return <DeviceOfflineOverlay {...props} />;

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value || undefined;
        setValue(v);
        // TODO: push v or send value back to gui server
      }}
      className="absolute border border-solid text-black rounded"
      style={{
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: props.fontSize,
        fontWeight: props.fontWeight.toLowerCase(),
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
