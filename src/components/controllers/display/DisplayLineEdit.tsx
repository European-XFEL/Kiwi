/**
 * DisplayLineEdit - controller component
 */

import React from 'react';
import type { DisplayLineEditProps } from '@/scene/scene_types/controllers/display';
import { FONT_FAMILY_DEFAULT } from '@/components/shared/helpers/fontDefaults';
import { HashTypes } from 'karabo-ts';

const DisplayLineEdit: React.FC<DisplayLineEditProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  isEnabled,
  primary,
}) => {
  const value = primary?.value;
  const propertyModel = primary?.propertyModel;

  const enabled = isEnabled ?? true;

  const displayValue = React.useMemo(() => {
    if (value === undefined) return '';

    const schemaAttrs = propertyModel?.schema.schemaAttrs;
    const prefix = schemaAttrs?.metricPrefixSymbol ?? '';
    const symbol = schemaAttrs?.unitSymbol ?? '';
    const displayUnit = `${prefix}${symbol}`.trim();
    const propType = schemaAttrs?.valueType;

    if (propType === HashTypes.Float32 || propType === HashTypes.Float64) {
      const num = Number(value);
      const formatted = Number.isNaN(num)
        ? String(value)
        : parseFloat(num.toPrecision(8)).toString();

      return displayUnit ? `${formatted} ${displayUnit}` : formatted;
    }

    const raw = String(value);
    return displayUnit ? `${raw} ${displayUnit}` : raw;
  }, [value, propertyModel]);

  return (
    <input
      type="text"
      value={displayValue}
      readOnly
      disabled={!enabled}
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
      className="border border-solid rounded px-1 w-full h-full text-gray-700 bg-gray-50 cursor-default"
      style={{
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: font_size,
        fontWeight: font_weight?.toLowerCase() ?? 'normal',
      }}
    />
  );
};

export default DisplayLineEdit;
