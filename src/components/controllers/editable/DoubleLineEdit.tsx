import * as React from "react";
import type { DoubleLineEditProps } from "@/scene/scene_types/controllers";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useControllerPermissions } from "@/components/shared/hooks/useControllerPermissions";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";

/**
 * Inner component: consumes permissions + renders the actual <input>.
 */
const DoubleLineEditInner: React.FC<{
  property: PropertyInfoOptional;
  decimals: number;
  font_size: number;
  font_weight: string;
}> = ({ property, decimals, font_size, font_weight }) => {
  const { canEdit, disabledReason } = useControllerPermissions();

  const [value, setValue] = React.useState<string>("");

  // Get unit from property schema
  const unit = React.useMemo(() => {
    if (!property || !property.schemaAttrs) return "";
    const prefix = property.schemaAttrs.metricPrefixSymbol ?? "";
    const symbol = property.schemaAttrs.unitSymbol ?? "";
    return `${prefix}${symbol}`.trim();
  }, [property]);

  // Format number based on decimals setting
  const formatValue = React.useCallback(
    (val: number): string => {
      if (decimals === -1) {
        return String(val); // auto mode
      } else {
        return val.toFixed(decimals); // fixed precision
      }
    },
    [decimals]
  );

  // Sync with property changes
  React.useEffect(() => {
    if (!property) {
      setValue("");
      return;
    }

    const incoming = property.value ?? property.schemaAttrs?.defaultValue ?? 0;

    const numValue =
      typeof incoming === "number" ? incoming : parseFloat(String(incoming));

    if (!isNaN(numValue)) {
      setValue(formatValue(numValue));
    } else {
      setValue("");
    }
  }, [property, formatValue]);

  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={(e) => {
          const numValue = parseFloat(e.target.value);
          if (!isNaN(numValue)) {
            setValue(formatValue(numValue));
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
        placeholder={canEdit ? "0.0" : "Read-only"}
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
 * Outer component: wiring (keys → property → ControllerContainer).
 * ControllerContainer handles:
 *  - device overlays
 *  - property overlays
 *  - permission computation
 */
const DoubleLineEdit: React.FC<DoubleLineEditProps> = (props) => {
  const { keys, x, y, width, height, decimals, font_size, font_weight } = props;

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
      className="flex items-center ml-1"
      showMissingPropertyOverlay
    >
      <DoubleLineEditInner
        property={typedProperty}
        decimals={decimals}
        font_size={font_size as number}
        font_weight={font_weight}
      />
    </ControllerContainer>
  );
};

export default DoubleLineEdit;
