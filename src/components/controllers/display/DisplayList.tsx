import React from "react";
import type { DisplayListProps } from "@/scene/scene_types/controllers/display";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import { useDeviceProperty } from "@/components/shared/hooks/useDeviceProperty";

/**
 * DisplayList - Read-only display of array/list values.
 * Shows comma-separated values from VectorBinding properties.
 */
const DisplayList: React.FC<DisplayListProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  const primaryKey = keys[0] ?? "";
  const { value, model } = useDeviceProperty(primaryKey);

  // Format array value as comma-separated string
  const displayValue = React.useMemo(() => {
    const actualValue =
      value ?? model?.property_schema?.schemaAttrs?.defaultValue ?? [];

    if (Array.isArray(actualValue)) {
      return actualValue.join(", ");
    }

    return String(actualValue);
  }, [value, model]);

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      className="overflow-clip flex items-center border border-solid px-1"
      showMissingPropertyOverlay
    >
      <span
        style={{
          width: "100%",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          display: "block",
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight.toLowerCase(),
        }}
      >
        {displayValue}
      </span>
    </ControllerContainer>
  );
};

export default DisplayList;
