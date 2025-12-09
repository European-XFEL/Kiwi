/**
 * DoubleLineEdit - controller component
 */
import * as React from "react";
import type { DoubleLineEditProps } from "@/scene/scene_types/controllers";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";

const DoubleLineEdit: React.FC<DoubleLineEditProps> = ({
  decimals = -1,
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  isEnabled = true,
  primary,
}) => {
  const value = primary?.value;
  const schemaAttrs = primary?.schemaAttrs;

  const [localValue, setLocalValue] = React.useState<string>("");

  const unit = React.useMemo(() => {
    const prefix = schemaAttrs?.metricPrefixSymbol ?? "";
    const symbol = schemaAttrs?.unitSymbol ?? "";
    return `${prefix}${symbol}`.trim();
  }, [schemaAttrs?.metricPrefixSymbol, schemaAttrs?.unitSymbol]);

  const formatValue = React.useCallback(
    (val: number): string =>
      decimals === -1
        ? parseFloat(val.toPrecision(8)).toString()
        : val.toFixed(decimals),
    [decimals]
  );

  React.useEffect(() => {
    const incoming = value ?? schemaAttrs?.defaultValue ?? 0;
    const numValue =
      typeof incoming === "number" ? incoming : parseFloat(String(incoming));

    setLocalValue(!isNaN(numValue) ? formatValue(numValue) : "");
  }, [value, schemaAttrs?.defaultValue, formatValue]);

  return (
    <div
      className="flex items-center gap-1 w-full h-full"
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          const numValue = parseFloat(e.target.value);
          if (!isNaN(numValue)) setLocalValue(formatValue(numValue));
        }}
        disabled={!isEnabled}
        className={`border border-solid rounded px-1 flex-1 min-w-0 ${
          isEnabled
            ? "text-black bg-white cursor-text"
            : "text-gray-500 bg-gray-100 cursor-not-allowed"
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight?.toLowerCase(),
        }}
        placeholder={isEnabled ? "0.0" : "Read-only"}
      />
      {unit && (
        <span
          className="text-black"
          style={{
            fontFamily: FONT_FAMILY_DEFAULT,
            fontSize: font_size,
            fontWeight: font_weight?.toLowerCase(),
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
};

export default DoubleLineEdit;
