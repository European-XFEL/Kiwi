/** CheckBox — DisplayCheckBox (read-only) and EditableCheckBox (interactive). */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/components/ControllerContainer';
import { CheckBoxModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { Checkbox } from '@/components/checkbox';

// CheckBox
// ----------------------------------------------------------------------------

const CHECKBOX_CLASSNAME =
  'border border-gray-700 rounded-none data-[state=checked]:bg-white data-[state=checked]:text-black data-[state=checked]:border-black';

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return false;
}

const DisplayCheckBox: React.FC<{
  model: CheckBoxModel;
  ctx?: ControllerContainerContext;
}> = ({ model: _model, ctx }) => {
  const checked = toBool(ctx?.primary?.value);
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      title={ctx?.tooltipText ?? ctx?.disabledReason}
    >
      <Checkbox
        checked={checked}
        disabled
        aria-readonly="true"
        className={CHECKBOX_CLASSNAME}
      />
    </div>
  );
};

const EditableCheckBox: React.FC<{
  model: CheckBoxModel;
  ctx?: ControllerContainerContext;
}> = ({ model: _model, ctx }) => {
  const checked = toBool(ctx?.primary?.value);
  const enabled = ctx?.isEnabled ?? false;

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      title={ctx?.tooltipText ?? ctx?.disabledReason}
    >
      <Checkbox
        checked={checked}
        disabled={!enabled}
        onCheckedChange={() => {
          // TODO: push !checked to backend
        }}
        className={CHECKBOX_CLASSNAME}
      />
    </div>
  );
};

registerRenderer('DisplayCheckBox', DisplayCheckBox);
registerRenderer('EditableCheckBox', EditableCheckBox);
