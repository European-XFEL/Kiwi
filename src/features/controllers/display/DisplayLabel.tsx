/**
 * DisplayLabel - controller component
 *
 * Reads value + schema from `primary` (single source of truth flow).
 * Uses centralized scalar formatter to reproduce the old smooth float rounding.
 */

import React from 'react';
import type { DisplayLabelProps } from '@/scene/scene_types/controllers/display';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';
import { scalarToString } from '@/features/controllers/utils/validation/toStringFormatters';
import { HashType } from '@/karabo/data';

const DisplayLabel: React.FC<DisplayLabelProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  primary,
}) => {
  const value = primary?.value;
  const binding = primary?.binding;

  const labelValue = React.useMemo(() => {
    if (value === undefined) return '';
    const unit = binding?.unit_label ?? '';

    /**
     * Prefer schema-provided abstract valueType when available.
     * Some flows may also provide primary.valueType already normalized.
     *
     * We intentionally do NOT force runtime `propertyModel.type` here.
     * The helper is tolerant of mixed representations anyway.
     */
    const hashType = binding?.hashType as HashType | undefined;

    return scalarToString({
      value,
      hashType,
      unit,
      floatPrecision: 8,
    });
  }, [value, binding, primary]);

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
