/**
 * DisplayLabel - controller component
 *
 * Reads value + schema from `primary` (single source of truth flow).
 * Uses centralized scalar formatter to reproduce the old smooth float rounding.
 */

import React from 'react';
import type { DisplayLabelProps } from '@/scene/scene_types/controllers/display';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';
import { formatScalarValueWithUnit } from '@/shared/helpers/validation_helpers/value_formatters';
import type { SchemaValueType } from '@/shared/helpers/validation_helpers/schema_type_identifier';

const DisplayLabel: React.FC<DisplayLabelProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  primary,
}) => {
  const value = primary?.propertyModel?.binding.getValue();
  const propertyModel = primary?.propertyModel;

  const labelValue = React.useMemo(() => {
    if (value === undefined) return '';

    const schemaAttrs = propertyModel?.schema.schemaAttrs;

    const prefix = schemaAttrs?.metricPrefixSymbol ?? '';
    const symbol = schemaAttrs?.unitSymbol ?? '';
    const unit = `${prefix}${symbol}`.trim();

    /**
     * Prefer schema-provided abstract valueType when available.
     * Some flows may also provide primary.valueType already normalized.
     *
     * We intentionally do NOT force runtime `propertyModel.type` here.
     * The helper is tolerant of mixed representations anyway.
     */
    const schemaValueType =
      (primary as any)?.valueType ??
      (schemaAttrs?.valueType as SchemaValueType | undefined);

    return formatScalarValueWithUnit({
      value,
      schemaValueType,
      unit,
      floatPrecision: 8,
    });
  }, [value, propertyModel, primary]);

  return (
    <div
      className="overflow-clip flex items-center justify-center border border-solid p-px w-full h-full"
      style={{
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: font_size,
        fontWeight: font_weight?.toLowerCase(),
      }}
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      {labelValue}
    </div>
  );
};

export default DisplayLabel;
