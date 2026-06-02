/** CheckBox — DisplayCheckBox (read-only) and EditableCheckBox (interactive). */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { CheckBoxModel } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/renderRegistry';
import { Checkbox } from '@/components/api';
import { isControllerEditable } from '../../utils/controller_semantics';
//import { Hash } from '@/karabo/data/hash';
//import { getNetwork } from '@/lib/singletons/api';

// CheckBox
// ----------------------------------------------------------------------------

const CHECKBOX_BASE =
  'border border-gray-700 rounded-none ' +
  'data-[state=checked]:bg-white data-[state=checked]:text-black data-[state=checked]:border-black';

const DISPLAY_CHECKBOX_CLASSNAME = CHECKBOX_BASE + ' pointer-events-none';
const EDITABLE_CHECKBOX_CLASSNAME = CHECKBOX_BASE;

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return false;
}

const DisplayCheckBox: React.FC<{
  model: CheckBoxModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const checked = toBool(ctx?.proxy?.value);
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Checkbox
        checked={checked}
        aria-readonly="true"
        className={DISPLAY_CHECKBOX_CLASSNAME}
      />
    </div>
  );
};

const EditableCheckBox: React.FC<{
  model: CheckBoxModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const checked = toBool(ctx?.proxy?.value);
  const enabled = ctx
    ? isControllerEditable(ctx.proxy, ctx.userAccessLevel)
    : false;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Checkbox
        checked={checked}
        disabled={!enabled}
        onCheckedChange={() => {
          // const deviceId = ctx?.proxy?.root.deviceId;
          // const propertyPath = ctx?.proxy?.path;
          // if (!deviceId || !propertyPath) return;
          // getNetwork().onReconfigure(
          //   deviceId,
          //   new Hash(propertyPath, !checked)
          // );
        }}
        className={EDITABLE_CHECKBOX_CLASSNAME}
      />
    </div>
  );
};

registerRenderer('DisplayCheckBox', DisplayCheckBox);
registerRenderer('EditableCheckBox', EditableCheckBox);
