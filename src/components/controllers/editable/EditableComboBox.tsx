import * as React from "react";
import type { EditableComboBoxProps } from "@/scene/scene_types/controllers";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useControllerPermissions } from "@/components/shared/hooks/useControllerPermissions";
import { useDeviceProperty } from "@/components/shared/hooks/useDeviceProperty";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import { VectorElementType } from "@/karabo_hash/HashValueType";

/**
 * Inner component: actually renders the <select> and consumes permissions.
 */
const EditableComboBoxInner: React.FC<{
  propertyKey: string | undefined;
  propertyValue: VectorElementType | undefined;
  defaultValue: VectorElementType | undefined;
  options: VectorElementType[];
  font_size?: number;
  font_weight: string;
}> = ({ propertyValue, defaultValue, options, font_size, font_weight }) => {
  const { canEdit, disabledReason } = useControllerPermissions();

  const [value, setValue] = React.useState<string | undefined>(undefined);

  // Sync local value with property + options
  React.useEffect(() => {
    const incoming = String(propertyValue ?? defaultValue ?? "");

    const matchExists =
      options.findIndex(
        (option: VectorElementType) => option.toString() === incoming
      ) >= 0;

    setValue(matchExists ? incoming : undefined);
  }, [propertyValue, defaultValue, options]);

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

  const primaryKey = keys[0] ?? "";
  const { value, schemaAttrs, propertyPath } = useDeviceProperty(primaryKey);

  const options = React.useMemo((): VectorElementType[] => {
    const schemaOptions = schemaAttrs?.options ?? [];
    return schemaOptions as VectorElementType[];
  }, [schemaAttrs]);

  const propertyValue = value as VectorElementType | undefined;
  const defaultValue = schemaAttrs?.defaultValue as
    | VectorElementType
    | undefined;

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
        propertyKey={propertyPath}
        propertyValue={propertyValue}
        defaultValue={defaultValue}
        options={options}
        font_size={font_size as number}
        font_weight={font_weight}
      />
    </ControllerContainer>
  );
};

export default EditableComboBox;
