import React from "react";
import type { DisplayCheckBoxProps } from "@/scene/scene_types/controllers";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import { Checkbox } from "../../ui/checkbox";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";

const DisplayCheckbox: React.FC<DisplayCheckBoxProps> = ({
  keys,
  x,
  y,
  width,
  height,
  font_size,
  font_weight,
}) => {
  const keysStr = useKaraboKeysString(keys);
  const { property } = useKaraboPropertyInfo(keysStr);

  const isChecked = React.useMemo(() => {
    const value = (property as PropertyInfo)?.value;
    if (typeof value === "boolean") return value;
    if (typeof value === "string")
      return value.toLowerCase() === "true" || value === "1";
    if (typeof value === "number") return value !== 0;
    return false;
  }, [(property as PropertyInfo)?.value]);

  const boxSize = Math.min(width, height, 18);

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      showMissingPropertyOverlay
      className="flex items-center justify-center"
    >
      <Checkbox
        checked={isChecked}
        disabled
        aria-label={`Display checkbox for ${keys.join(", ")}`}
        aria-readonly="true"
        className="
          border
          border-gray-700
          rounded-none
          data-[state=checked]:bg-white
          data-[state=checked]:text-black
          data-[state=checked]:border-black
        "
        style={{
          width: boxSize,
          height: boxSize,
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight,
        }}
      />
    </ControllerContainer>
  );
};

export default DisplayCheckbox;
