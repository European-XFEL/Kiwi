/**
 * DisplayCheckbox - controller component
 * Uses injected primary prop - no useDeviceProperty call needed
 */

import * as React from 'react';
import type { DisplayCheckBoxProps } from '@/scene/scene_types/controllers';
import { Checkbox } from '@/components/ui/checkbox';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';

const CHECKBOX_CLASSNAME =
  'border border-gray-700 rounded-none data-[state=checked]:bg-white data-[state=checked]:text-black data-[state=checked]:border-black';

function coerceToBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  // Others fallback
  return false;
}

const DisplayCheckbox: React.FC<DisplayCheckBoxProps> = React.memo(
  ({ font_size, font_weight, tooltipText, disabledReason, primary }) => {
    const label = primary?.propertyIndicator?.label ?? 'property';
    const title = tooltipText || disabledReason || label;

    const checked = coerceToBoolean(primary?.value);

    const checkboxStyle = React.useMemo<React.CSSProperties>(
      () => ({
        width: 18,
        height: 18,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: font_size,
        fontWeight: font_weight,
      }),
      [font_size, font_weight]
    );

    return (
      <div
        className="flex items-center justify-center w-full h-full"
        title={title}
      >
        <Checkbox
          checked={checked}
          disabled
          aria-label={`Display checkbox for ${label}`}
          aria-readonly="true"
          className={CHECKBOX_CLASSNAME}
          style={checkboxStyle}
        />
      </div>
    );
  }
);

DisplayCheckbox.displayName = 'DisplayCheckbox';

export default DisplayCheckbox;
