/**
 * DisplayCheckbox - controller component
 * Uses injected primary prop - no useDeviceProperty call needed
 */

import * as React from "react";
import type { DisplayCheckBoxProps } from "@/scene/scene_types/controllers";
import { Checkbox } from "@/components/ui/checkbox";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";

const DisplayCheckbox: React.FC<DisplayCheckBoxProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  primary,
}) => {
  const value = primary?.value;

  const isChecked = React.useMemo(() => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string")
      return value.toLowerCase() === "true" || value === "1";
    if (typeof value === "number") return value !== 0;
    return false;
  }, [value]);

  return (
    <div
      className="flex items-center justify-center w-full h-full"
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      <Checkbox
        checked={isChecked}
        disabled
        aria-label={`Display checkbox for ${primary?.propertyIndicator?.label}`}
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
          width: 18,
          height: 18,
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight,
        }}
      />
    </div>
  );
};

export default DisplayCheckbox;
