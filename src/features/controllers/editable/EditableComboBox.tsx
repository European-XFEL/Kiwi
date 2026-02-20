import * as React from 'react';
import type { EditableComboBoxProps } from '@/scene/scene_types/controllers';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';
import { SimpleValueTypes } from '@/karabo/data/types';

const EditableComboBox: React.FC<EditableComboBoxProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  isEnabled,
  primary,
}) => {
  const value = primary?.value;
  const binding = primary?.binding;

  const options = (binding?.options ?? []) as SimpleValueTypes[];

  const { optionStrings, optionSet } = React.useMemo(() => {
    const strs = options.map((o) => o.toString());
    return { optionStrings: strs, optionSet: new Set(strs) };
  }, [options]);

  const incoming = value == null ? '' : String(value);
  const selected = optionSet.has(incoming) ? incoming : '';

  const title =
    tooltipText || disabledReason || primary?.propertyIndicator?.label;

  return (
    <div className="w-full h-full" title={title}>
      <select
        value={selected}
        // TODO: Resolve internal TODO and activate the whole onChange handler
        // onChange={(e) => {
        //   const v = e.target.value; // "" means placeholder
        //   // TODO: push value to backend (send v === "" ? undefined : v)
        // }}
        disabled={!isEnabled}
        className={`w-full h-full border border-solid rounded ${
          isEnabled
            ? 'text-black bg-white cursor-pointer'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight?.toLowerCase(),
        }}
      >
        <option value="" disabled>
          {isEnabled ? 'Select an option' : 'Read-only'}
        </option>

        {optionStrings.map((str) => (
          <option key={str} value={str}>
            {str}
          </option>
        ))}
      </select>
    </div>
  );
};

export default EditableComboBox;
