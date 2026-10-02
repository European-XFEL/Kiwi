/** DoubleLineEdit — float input with pending edits on the property proxy. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DoubleLineEditModel } from '@/karabo/common/api';
import { isControllerEditable } from '../utils/controller_semantics';
import { getControllerFontStyle } from '../utils/fonts';

// DoubleLineEdit
// ----------------------------------------------------------------------------

function toFloatString(value: unknown, decimals: number): string {
  if (value == null) return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(num)) return '';
  return decimals >= 0
    ? num.toFixed(decimals)
    : String(parseFloat(num.toPrecision(8)));
}

const DoubleLineEdit: React.FC<{
  model: DoubleLineEditModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const proxy = ctx?.proxy;
  const proxyValue = proxy?.value;
  const editValue = proxy?.edit_value?.value_;
  const unit = ctx?.proxy?.binding?.unit_label ?? '';
  const enabled = ctx
    ? isControllerEditable(ctx.proxy, ctx.userAccessLevel)
    : false;

  const [localValue, setLocalValue] = React.useState(() =>
    toFloatString(editValue ?? proxyValue, model.decimals)
  );
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    const next = toFloatString(editValue ?? proxyValue, model.decimals);
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, editValue, isEditing, model.decimals]);

  React.useEffect(() => {
    // Clearing an edit must restore the device text even while focused.
    return proxy?.edit_update(() => {
      setLocalValue(
        toFloatString(proxy.edit_value?.value_ ?? proxy.value, model.decimals)
      );
    });
  }, [proxy, model.decimals]);

  return (
    <div className="flex items-center gap-1 w-full h-full">
      <input
        data-testid="editable-double-line-edit"
        type="text"
        inputMode="decimal"
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => {
          const text = e.target.value;
          const parsed = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(
            text
          )
            ? Number(text)
            : NaN;
          if (proxy && enabled) {
            proxy.edit_value = Number.isFinite(parsed) ? parsed : undefined;
          }
          // Keep intermediate drafts instead of the formatted edit notification.
          setLocalValue(text);
        }}
        onBlur={() => setIsEditing(false)}
        disabled={!enabled}
        className={`border border-solid rounded px-1 flex-1 min-w-0 ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{
          ...getControllerFontStyle(),
        }}
        placeholder={enabled ? '0.0' : 'Read-only'}
      />
      {unit ? (
        <span
          className="text-black"
          style={{
            ...getControllerFontStyle(),
          }}
        >
          {unit}
        </span>
      ) : null}
    </div>
  );
};

export default DoubleLineEdit;
