import * as React from "react";
import type { EditableComboBoxProps } from "@/scene/scene_types/controllers";
import {
  ControllerContainer,
  useControllerPermissions,
} from "@/components/sceneView/ControllerContainer";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import { VectorElementType } from "@/karabo_hash/HashValueType";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";

/**
 * EditableComboBox - Dropdown input widget for selecting a value from a set.
 *
 * Editability rules (handled by ControllerContainer):
 * - Device must be online
 * - User access level must satisfy property.schemaAttrs.requiredAccessLevel
 * - Property accessMode must allow editing (ReadOnly / InitOnly / Reconfigurable)
 */
const EditableComboBox: React.FC<EditableComboBoxProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  // Join keys for compatibility with hooks
  const joinedKeys = useKaraboKeysString(keys);
  const { property } = useKaraboPropertyInfo(joinedKeys);

  // Narrow property to the scalar PropertyInfo type this widget expects
  const typedProperty = property as PropertyInfoOptional;

  // Get permission state from ControllerContainer
  const { canEdit, disabledReason } = useControllerPermissions();

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

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      checkPermissions
      showPropertyOverlay
    >
      <select
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value || undefined;
          setValue(v);
          // TODO: push value to backend or GUI server via WebSocket
        }}
        disabled={!canEdit}
        title={!canEdit ? disabledReason : ""}
        className={`w-full h-full border border-solid rounded ${
          canEdit
            ? "text-black bg-white cursor-pointer"
            : "text-gray-500 bg-gray-100 cursor-not-allowed"
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight.toLowerCase(),
        }}
      >
        <option value="" disabled>
          {canEdit ? "Select an option" : "Read-only"}
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
    </ControllerContainer>
  );
};

export default EditableComboBox;
