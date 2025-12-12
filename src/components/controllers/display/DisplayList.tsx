/**
 * DisplayList - controller component
 */

import React from 'react';
import type { DisplayListProps } from '@/scene/scene_types/controllers/display';
import { FONT_FAMILY_DEFAULT } from '@/components/shared/helpers/fontDefaults';

const DisplayList: React.FC<DisplayListProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  primary,
}) => {
  const value = primary?.value;
  const model = primary?.model;

  // Format array value as comma-separated string
  const displayValue = React.useMemo(() => {
    const actualValue =
      value ?? model?.property_schema?.schemaAttrs?.defaultValue ?? [];

    if (Array.isArray(actualValue)) {
      return actualValue.join(', ');
    }

    return String(actualValue);
  }, [value, model]);

  return (
    <div
      className="overflow-clip flex items-center border border-solid px-1 w-full h-full"
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      <span
        style={{
          width: '100%',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          display: 'block',
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight?.toLowerCase(),
        }}
      >
        {displayValue}
      </span>
    </div>
  );
};

export default DisplayList;
