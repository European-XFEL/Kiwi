import * as React from "react";
import type { EditableComboBoxProps } from "@/scene/scene_types/controllers";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useControllerPermissions } from "@/components/shared/hooks/useControllerPermissions";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import { VectorElementType } from "@/karabo_hash/HashValueType";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";

/**
 * Inner component: actually renders the <select> and consumes permissions.
 */
const EditableComboBoxInner: React.FC<{
  property: PropertyInfoOptional;
  options: VectorElementType[];
  font_size?: number;
  font_weight: string;
}> = ({ property, options, font_size, font_weight }) => {
  const { canEdit, disabledReason } = useControllerPermissions();

  console.log(
    `[EditableComboBoxInner] Permissions for ${property?.key}: canEdit=${canEdit}, reason="${disabledReason}"`
  );

  const [value, setValue] = React.useState<string | undefined>(undefined);

  // Sync local value with property + options
  React.useEffect(() => {
    if (!property) {
      setValue(undefined);
      return;
    }

    const incoming = String(
      property.value ?? property.schemaAttrs?.defaultValue ?? ""
    );

    const matchExists =
      options.findIndex(
        (option: VectorElementType) => option.toString() === incoming
      ) >= 0;

    setValue(matchExists ? incoming : undefined);
  }, [property, options]);

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        if (!canEdit) return; // safety guard
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
  );
};

/**
 * Outer component: wires keys → ControllerContainer.
 * ControllerContainer computes permissions & overlays, inner consumes context.
 */
const EditableComboBox: React.FC<EditableComboBoxProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  // Join keys for compatibility with hooks
  const joinedKeys = useKaraboKeysString(keys);
  const { property } = useKaraboPropertyInfo(joinedKeys);

  const typedProperty = property as PropertyInfoOptional;

  const options = React.useMemo((): VectorElementType[] => {
    const schemaOptions = typedProperty?.schemaAttrs?.options ?? [];
    return schemaOptions as VectorElementType[];
  }, [typedProperty]);

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      showMissingPropertyOverlay
    >
      <EditableComboBoxInner
        property={typedProperty}
        options={options}
        font_size={font_size as number}
        font_weight={font_weight}
      />
    </ControllerContainer>
  );
};

export default EditableComboBox;
