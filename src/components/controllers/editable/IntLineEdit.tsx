import * as React from "react";
import type { IntLineEditProps } from "@/scene/scene_types/controllers";
import {
  ControllerContainer,
  useControllerPermissions,
} from "@/components/sceneView/ControllerContainer";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";

/**
 * IntLineEdit - Integer input field with validation.
 *
 * Editability rules (handled by ControllerContainer):
 * - Device must be online
 * - User access level must satisfy property.schemaAttrs.requiredAccessLevel
 * - Property accessMode must allow editing (ReadOnly / InitOnly / Reconfigurable)
 * - Only accepts integer values (parsed on blur)
 */
const IntLineEdit: React.FC<IntLineEditProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  // Join keys for compatibility with hooks
  const joinedKeys = useKaraboKeysString(keys);
  const { property } = useKaraboPropertyInfo(joinedKeys);

  // Narrow property to PropertyInfo
  const typedProperty = property as PropertyInfoOptional;

  // Get permission state from ControllerContainer
  const { canEdit, disabledReason } = useControllerPermissions();

  const [value, setValue] = React.useState<string>("");

  // Get unit from property schema
  const unit = React.useMemo(() => {
    if (!typedProperty || !typedProperty.schemaAttrs) return "";
    const prefix = typedProperty.schemaAttrs.metricPrefixSymbol ?? "";
    const symbol = typedProperty.schemaAttrs.unitSymbol ?? "";
    return `${prefix}${symbol}`.trim();
  }, [typedProperty]);

  // Sync with property changes
  React.useEffect(() => {
    if (!typedProperty) {
      setValue("");
      return;
    }

    const incoming =
      typedProperty.value ?? typedProperty.schemaAttrs?.defaultValue ?? 0;

    const intValue =
      typeof incoming === "number" ? incoming : parseInt(String(incoming), 10);

    if (!isNaN(intValue)) {
      setValue(String(intValue));
    } else {
      setValue("");
    }
  }, [typedProperty]);

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      className="flex items-center"
      checkPermissions
      showPropertyOverlay
    >
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={(e) => {
          const intValue = parseInt(e.target.value, 10);
          if (!isNaN(intValue)) {
            setValue(String(intValue));
            // TODO: push value to backend or GUI server via WebSocket
          }
        }}
        disabled={!canEdit}
        title={!canEdit ? disabledReason : ""}
        className={`border border-solid rounded px-1 flex-1 w-full ${
          canEdit
            ? "text-black bg-white cursor-text"
            : "text-gray-500 bg-gray-100 cursor-not-allowed"
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight.toLowerCase(),
          minWidth: 0,
        }}
        placeholder={canEdit ? "0" : "Read-only"}
      />
      {unit && (
        <span
          className="ml-1 text-black"
          style={{
            fontFamily: FONT_FAMILY_DEFAULT,
            fontSize: font_size,
            fontWeight: font_weight.toLowerCase(),
          }}
        >
          {unit}
        </span>
      )}
    </ControllerContainer>
  );
};

export default IntLineEdit;
