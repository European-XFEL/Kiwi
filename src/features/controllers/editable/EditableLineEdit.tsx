import * as React from 'react';
import type { EditableLineEditProps } from '@/scene/scene_types/controllers';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';

const EditableLineEdit: React.FC<EditableLineEditProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  isEnabled,
  primary,
}) => {
  const proxyValue = primary?.value;

  const [localValue, setLocalValue] = React.useState<string>(() =>
    proxyValue == null ? '' : String(proxyValue)
  );
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;

    const next = proxyValue == null ? '' : String(proxyValue);
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing]);

  const title =
    tooltipText || disabledReason || primary?.propertyIndicator?.label;

  return (
    <div className="w-full h-full" title={title}>
      <input
        type="text"
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          // TODO: push value to backend (e.g., localValue)
        }}
        disabled={!isEnabled}
        className={`border border-solid rounded px-1 w-full h-full ${
          isEnabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight?.toLowerCase(),
        }}
        placeholder={isEnabled ? 'Enter text...' : 'Read-only'}
      />
    </div>
  );
};

export default EditableLineEdit;
