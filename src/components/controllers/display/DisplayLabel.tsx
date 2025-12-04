import React from "react";
import type { DisplayLabelProps } from "../../../scene/scene_types/controllers/display";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { FONT_FAMILY_DEFAULT } from "../../shared/helpers/fontDefaults";
import { HashTypes } from "karabo-ts";
import { useDeviceProperty } from "../../shared/hooks/useDeviceProperty";

const DisplayLabel: React.FC<DisplayLabelProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  const primaryKey = keys[0] ?? "";
  const { value, model } = useDeviceProperty(primaryKey);

  const labelValue = React.useMemo(() => {
    if (value === undefined) return "";

    const schemaAttrs = model?.property_schema?.schemaAttrs;
    const prefix = schemaAttrs?.metricPrefixSymbol ?? "";
    const symbol = schemaAttrs?.unitSymbol ?? "";
    const displayUnit = `${prefix}${symbol}`.trim();
    const propType = model?.property_schema?.schemaAttrs?.valueType;

    // Float types: format nicely with limited precision
    if (propType === HashTypes.Float32 || propType === HashTypes.Float64) {
      const num = Number(value);
      const displayValue = Number.isNaN(num)
        ? String(value)
        : parseFloat(num.toPrecision(8)).toString();

      return displayUnit ? `${displayValue} ${displayUnit}` : displayValue;
    }

    // Non-float types: just show string representation
    const raw = String(value);
    return displayUnit ? `${raw} ${displayUnit}` : raw;
  }, [value, model]);

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      showMissingPropertyOverlay
    >
      <div
        className="overflow-clip flex items-center justify-center border border-solid p-px w-full h-full"
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight.toLowerCase(),
        }}
      >
        {labelValue}
      </div>
    </ControllerContainer>
  );
};

export default DisplayLabel;
