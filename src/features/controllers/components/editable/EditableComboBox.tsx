/** EditableComboBox and EditableChoiceElement — dropdown select from allowed values. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import {
  EditableComboBoxModel,
  FONT_FAMILY_DEFAULT,
} from '@/karabo/common/api';
import { isControllerEditable } from '../../utils/controller_semantics';

// ComboBox
// ----------------------------------------------------------------------------

function ComboBox({
  value,
  options,
  enabled,
}: {
  value: unknown;
  options: string[];
  enabled: boolean;
}) {
  const current = String(value ?? '');

  return (
    <div className="w-full h-full flex items-center">
      {options.length > 0 ? (
        <select
          value={current}
          disabled={!enabled}
          onChange={() => {
            // TODO: push selected value to backend
          }}
          className={`w-full border border-solid rounded px-1 ${
            enabled
              ? 'text-black bg-white cursor-pointer'
              : 'text-gray-500 bg-gray-100 cursor-not-allowed'
          }`}
          style={{ fontFamily: FONT_FAMILY_DEFAULT }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={current}
          readOnly
          disabled
          className="w-full border border-solid rounded px-1 text-gray-500 bg-gray-100"
          style={{ fontFamily: FONT_FAMILY_DEFAULT }}
        />
      )}
    </div>
  );
}

// EditableComboBox
// ----------------------------------------------------------------------------

const EditableComboBox: React.FC<{
  model: EditableComboBoxModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const value = ctx?.proxy?.value;
  const options: string[] = (ctx?.proxy?.binding as any)?.options ?? [];
  const enabled = ctx
    ? isControllerEditable(ctx.proxy, ctx.userAccessLevel)
    : false;
  return <ComboBox value={value} options={options} enabled={enabled} />;
};

export default EditableComboBox;
