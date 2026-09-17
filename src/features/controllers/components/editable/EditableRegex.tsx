/** EditableRegex — text input. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { EditableRegexModel } from '@/karabo/common/api';
import { isControllerEditable } from '../../utils/controller_semantics';
import { getControllerFontStyle } from '../../utils/fonts';

// EditableRegex
// ----------------------------------------------------------------------------

const EditableRegex: React.FC<{
  model: EditableRegexModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const proxyValue = ctx?.proxy?.value;
  const enabled = ctx
    ? isControllerEditable(ctx.proxy, ctx.userAccessLevel)
    : false;

  const [localValue, setLocalValue] = React.useState(String(proxyValue ?? ''));
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    const next = String(proxyValue ?? '');
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing]);

  return (
    <div className="w-full h-full flex items-center">
      <input
        data-testid="editable-regex"
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
        style={{
          ...getControllerFontStyle(),
        }}
      />
    </div>
  );
};

export default EditableRegex;
