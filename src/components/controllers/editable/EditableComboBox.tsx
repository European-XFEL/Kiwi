import * as React from "react";
import type { EditableComboBoxProps } from "@/scene/scene_types/controllers";
import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "@/components/shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import { VectorElementType } from "@/karabo_hash/HashValueType";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";
import { usePropertyPermissions } from "@/components/shared/hooks/usePropertyPermission";

/**
 * EditableComboBox - Dropdown input widget for selecting a value from a set.
 *
 * Editability rules:
 * - Device must be online
 * - User access level must satisfy property.schemaAttrs.requiredAccessLevel
 * - Property accessMode must allow editing (ReadOnly / InitOnly / Reconfigurable)
 */
const EditableComboBox: React.FC<EditableComboBoxProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  // Join keys for compatibility with hooks
  const joinedKeys = useKaraboKeysString(keys);
  const { deviceId, property } = useKaraboPropertyInfo(joinedKeys);
  const offline = useDeviceOnlineStatus(deviceId);

  // Narrow property to the scalar PropertyInfo type this widget expects
  const typedProperty = property as PropertyInfoOptional;

  // Centralized permission logic
  const { canEdit, disabledReason } = usePropertyPermissions(typedProperty);

  const [value, setValue] = React.useState<string | undefined>(undefined);

  const options = React.useMemo((): VectorElementType[] => {
    const schemaOptions = typedProperty?.schemaAttrs?.options ?? [];
    return schemaOptions as VectorElementType[];
  }, [typedProperty]);

  // Sync with property changes
  React.useEffect(() => {
    if (!typedProperty) {
      setValue(undefined);
      return;
    }

    const incoming = String(
      typedProperty.value ?? typedProperty.schemaAttrs?.defaultValue ?? ""
    );

    const matchExists =
      options.findIndex(
        (option: VectorElementType) => option.toString() === incoming
      ) >= 0;

    setValue(matchExists ? incoming : undefined);
  }, [typedProperty, options]);

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

  const finalCanEdit = canEdit;

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value || undefined;
        setValue(v);
        // TODO: push value to backend or GUI server via WebSocket
      }}
      disabled={!finalCanEdit}
      title={!finalCanEdit ? disabledReason : ""}
      className={`absolute border border-solid rounded ${
        finalCanEdit
          ? "text-black bg-white cursor-pointer"
          : "text-gray-500 bg-gray-100 cursor-not-allowed"
      }`}
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
        {finalCanEdit ? "Select an option" : "Read-only"}
      </option>
      {options.map((opt) => {
        const str = opt.toString();
        return (
          <option key={str} value={str}>
            {str}
          </option>
        );
      })}
    </select>
  );
};

export default EditableComboBox;
