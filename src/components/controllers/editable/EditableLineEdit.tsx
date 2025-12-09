/**
 * EditableLineEdit - controller component
 */

import * as React from "react";
import type { EditableLineEditProps } from "@/scene/scene_types/controllers";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";

const EditableLineEdit: React.FC<EditableLineEditProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  isEnabled,
  primary,
}) => {
  const value = primary?.value;
  const schemaAttrs = primary?.schemaAttrs;

  const [localValue, setLocalValue] = React.useState<string>("");

  React.useEffect(() => {
    const incoming = value ?? schemaAttrs?.defaultValue ?? "";
    setLocalValue(String(incoming));
  }, [value, schemaAttrs?.defaultValue]);

  return (
    <div
      className="w-full h-full"
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          // TODO: push value to backend
        }}
        disabled={!isEnabled}
        className={`border border-solid rounded px-1 w-full h-full ${
          isEnabled
            ? "text-black bg-white cursor-text"
            : "text-gray-500 bg-gray-100 cursor-not-allowed"
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight?.toLowerCase(),
        }}
        placeholder={isEnabled ? "Enter text..." : "Read-only"}
      />
    </div>
  );
};

export default EditableLineEdit;
