/**
 * EditableComboBox - controller component
 */

import * as React from 'react';
import type { EditableComboBoxProps } from '@/scene/scene_types/controllers';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';
import { VectorElementType } from '@/karabo_hash/HashValueType';

const EditableComboBox: React.FC<EditableComboBoxProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  isEnabled,
  primary,
}) => {
  const value = primary?.value;
  const schemaAttrs = primary?.schemaAttrs;

  const [localValue, setLocalValue] = React.useState<string | undefined>(
    undefined
  );

  const options = React.useMemo((): VectorElementType[] => {
    const schemaOptions = schemaAttrs?.options ?? [];
    return schemaOptions as VectorElementType[];
  }, [schemaAttrs]);

  React.useEffect(() => {
    const incoming = String(value ?? schemaAttrs?.defaultValue ?? '');
    const matchExists =
      options.findIndex((option) => option.toString() === incoming) >= 0;
    setLocalValue(matchExists ? incoming : undefined);
  }, [value, schemaAttrs?.defaultValue, options]);

  return (
    <div
      className="w-full h-full"
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      <select
        value={localValue ?? ''}
        onChange={(e) => {
          const v = e.target.value || undefined;
          setLocalValue(v);
          // TODO: push value to backend
        }}
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
        {options.map((opt) => {
          const str = opt.toString();
          return (
            <option key={str} value={str}>
              {str}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default EditableComboBox;
