import * as React from "react";
import type { IntLineEditProps } from "@/scene/scene_types/controllers";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useControllerPermissions } from "@/components/shared/hooks/useControllerPermissions";
import { useDeviceProperty } from "@/components/shared/hooks/useDeviceProperty";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";

/**
 * Inner part: actually renders the input and consumes permissions context.
 */
const IntLineEditInner: React.FC<{
  propertyValue: number | undefined;
  defaultValue: number | undefined;
  metricPrefixSymbol: string | undefined;
  unitSymbol: string | undefined;
  font_size?: number;
  font_weight: string;
}> = ({
  propertyValue,
  defaultValue,
  metricPrefixSymbol,
  unitSymbol,
  font_size,
  font_weight,
}) => {
  const { canEdit, disabledReason } = useControllerPermissions();
  const [value, setValue] = React.useState<string>("");

  // Unit from schema
  const unit = React.useMemo(() => {
    const prefix = metricPrefixSymbol ?? "";
    const symbol = unitSymbol ?? "";
    return `${prefix}${symbol}`.trim();
  }, [metricPrefixSymbol, unitSymbol]);

  // Sync with property/value
  React.useEffect(() => {
    const incoming = propertyValue ?? defaultValue ?? 0;

    const intValue =
      typeof incoming === "number" ? incoming : parseInt(String(incoming), 10);

    setValue(!isNaN(intValue) ? String(intValue) : "");
  }, [propertyValue, defaultValue]);

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

  const primaryKey = keys[0] ?? "";
  const { value, schemaAttrs } = useDeviceProperty(primaryKey);

  const propertyValue = typeof value === "number" ? value : undefined;
  const defaultValue =
    typeof schemaAttrs?.defaultValue === "number"
      ? schemaAttrs.defaultValue
      : undefined;
  const metricPrefixSymbol = schemaAttrs?.metricPrefixSymbol;
  const unitSymbol = schemaAttrs?.unitSymbol;

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
        propertyValue={propertyValue}
        defaultValue={defaultValue}
        metricPrefixSymbol={metricPrefixSymbol}
        unitSymbol={unitSymbol}
        font_size={font_size as number}
        font_weight={font_weight}
      />
    </ControllerContainer>
  );
};

export default IntLineEdit;
