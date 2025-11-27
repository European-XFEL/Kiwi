import * as React from "react";
import type { IntLineEditProps } from "@/scene/scene_types/controllers";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useControllerPermissions } from "@/components/shared/hooks/useControllerPermissions";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";

/**
 * Inner part: actually renders the input and consumes permissions context.
 */
const IntLineEditInner: React.FC<{
  property: PropertyInfoOptional;
  font_size?: number;
  font_weight: string;
}> = ({ property, font_size, font_weight }) => {
  const { canEdit, disabledReason } = useControllerPermissions();
  const [value, setValue] = React.useState<string>("");

  // Unit from schema
  const unit = React.useMemo(() => {
    if (!property || !property.schemaAttrs) return "";
    const prefix = property.schemaAttrs.metricPrefixSymbol ?? "";
    const symbol = property.schemaAttrs.unitSymbol ?? "";
    return `${prefix}${symbol}`.trim();
  }, [property]);

  // Sync with property/value
  React.useEffect(() => {
    if (!property) {
      setValue("");
      return;
    }

    const incoming = property.value ?? property.schemaAttrs?.defaultValue ?? 0;

    const intValue =
      typeof incoming === "number" ? incoming : parseInt(String(incoming), 10);

    setValue(!isNaN(intValue) ? String(intValue) : "");
  }, [property]);

  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          if (!canEdit) return; // extra safety
          setValue(e.target.value);
        }}
        onBlur={(e) => {
          if (!canEdit) return;
          const intValue = parseInt(e.target.value, 10);
          if (!isNaN(intValue)) {
            setValue(String(intValue));
            // TODO: push value to backend / GUI server
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
    </>
  );
};

/**
 * Outer wrapper: wires keys → ControllerContainer.
 * ControllerContainer computes permissions & overlays, inner uses the context.
 */
const IntLineEdit: React.FC<IntLineEditProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  const joinedKeys = useKaraboKeysString(keys);
  const { property } = useKaraboPropertyInfo(joinedKeys);
  const typedProperty = property as PropertyInfoOptional;

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      className="flex items-center"
      showMissingPropertyOverlay
    >
      <IntLineEditInner
        property={typedProperty}
        font_size={font_size as number}
        font_weight={font_weight}
      />
    </ControllerContainer>
  );
};

export default IntLineEdit;
