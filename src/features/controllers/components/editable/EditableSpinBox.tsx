/** EditableSpinBox — integer spin box, syncs from device. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/controllers/components/ControllerContainer';
import { EditableSpinBoxModel } from '@/karabo/common/models/widgets/controllers/editable';
import { registerRenderer } from '@/features/scene-view/registry';
import { FONT_FAMILY_DEFAULT } from '@/karabo/common/utils/fontDefaults';

// EditableSpinBox
// ----------------------------------------------------------------------------

const EditableSpinBox: React.FC<{
  model: EditableSpinBoxModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const proxyValue = ctx?.primary?.value;
  const enabled = ctx?.isEnabled ?? false;

  const [localValue, setLocalValue] = React.useState(() =>
    String(Math.trunc(Number(proxyValue ?? 0)))
  );
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    const next = String(Math.trunc(Number(proxyValue ?? 0)));
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing]);

  return (
    <div
      className="w-full h-full flex items-center"
      title={ctx?.tooltipText ?? ctx?.disabledReason}
    >
      <input
        type="number"
        step={1}
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          setIsEditing(false);
          const parsed = Math.trunc(parseFloat(e.target.value));
          if (Number.isFinite(parsed)) {
            setLocalValue(String(parsed));
            // TODO: push parsed to backend
          } else {
            setLocalValue(String(Math.trunc(Number(proxyValue ?? 0))));
          }
        }}
        disabled={!enabled}
        className={`border border-solid rounded px-1 w-full ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: model.font_size,
          fontWeight: model.font_weight,
        }}
      />
    </div>
  );
};

registerRenderer('EditableSpinBox', EditableSpinBox);

export default EditableSpinBox;
