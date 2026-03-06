/** EditableRegex — text input. */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { EditableRegexModel, FONT_FAMILY_DEFAULT } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/registry';

// EditableRegex
// ----------------------------------------------------------------------------

const EditableRegex: React.FC<{
  model: EditableRegexModel;
  ctx?: ControllerContainerContext;
}> = ({ model: _model, ctx }) => {
  const proxyValue = ctx?.primary?.value;
  const enabled = ctx?.isEnabled ?? false;

  const [localValue, setLocalValue] = React.useState(String(proxyValue ?? ''));
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    const next = String(proxyValue ?? '');
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing]);

  return (
    <div
      className="w-full h-full flex items-center"
      title={ctx?.tooltipText ?? ctx?.disabledReason}
    >
      <input
        type="text"
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          // TODO: push localValue to backend
        }}
        disabled={!enabled}
        className={`w-full border border-solid rounded px-1 ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{ fontFamily: FONT_FAMILY_DEFAULT }}
      />
    </div>
  );
};

registerRenderer('EditableRegex', EditableRegex);

export default EditableRegex;
