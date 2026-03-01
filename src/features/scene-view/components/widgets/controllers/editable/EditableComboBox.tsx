/** EditableComboBox and EditableChoiceElement — dropdown select from allowed values. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/ControllerContainer';
import {
  EditableComboBoxModel,
  EditableChoiceElementModel,
} from '@/karabo/common/models/widgets/controllers/editable';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { FONT_FAMILY_DEFAULT } from '@/features/controllers/utils/fontDefaults';

// ComboBox
// ----------------------------------------------------------------------------

function ComboBox({
  value,
  options,
  enabled,
  title,
}: {
  value: unknown;
  options: string[];
  enabled: boolean;
  title?: string;
}) {
  const current = String(value ?? '');

  return (
    <div className="w-full h-full flex items-center" title={title}>
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
}> = ({ model: _model, ctx }) => {
  const value = ctx?.primary?.value;
  const options: string[] = (ctx?.primary?.binding as any)?.options ?? [];
  const enabled = ctx?.isEnabled ?? false;
  return (
    <ComboBox
      value={value}
      options={options}
      enabled={enabled}
      title={ctx?.tooltipText ?? ctx?.disabledReason}
    />
  );
};

// EditableChoiceElement
// ----------------------------------------------------------------------------

const EditableChoiceElement: React.FC<{
  model: EditableChoiceElementModel;
  ctx?: ControllerContainerContext;
}> = ({ model: _model, ctx }) => {
  const value = ctx?.primary?.value;
  const options: string[] = (ctx?.primary?.binding as any)?.options ?? [];
  const enabled = ctx?.isEnabled ?? false;
  return (
    <ComboBox
      value={value}
      options={options}
      enabled={enabled}
      title={ctx?.tooltipText ?? ctx?.disabledReason}
    />
  );
};

registerRenderer('EditableComboBox', EditableComboBox);
registerRenderer('EditableChoiceElement', EditableChoiceElement);
