import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DoubleLineEditModel } from '@/karabo/common/api';
import { isControllerEditable } from '../utils/controller_semantics';
import { getControllerFontStyle } from '../utils/fonts';
import { FloatBinding, getEditorValue } from '@/lib/binding/api';
import { NumberValidator, ValidatorState } from '@/lib/validators';
import { normalizeFloat32 } from '../utils/floatFormatting';
import { getBindingValue } from '../utils/getBindingValue';

const DEFAULT_FLOAT_PRECISION = 8;

function toFloatString(
  value: unknown,
  decimals: number,
  float32: boolean
): string {
  if (value == null) {
    return '';
  }
  let num = Number(value);
  if (!Number.isFinite(num)) {
    return '';
  }

  if (float32) {
    num = normalizeFloat32(num);
  } else if (decimals < 0) {
    num = Number(num.toPrecision(DEFAULT_FLOAT_PRECISION));
  }
  return decimals >= 0 ? num.toFixed(decimals) : String(num);
}

const DoubleLineEdit: React.FC<{
  model: DoubleLineEditModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const proxy = ctx?.proxy;
  const proxyValue = getBindingValue(proxy);
  const editorValue = getEditorValue(proxy);
  const binding = proxy?.binding;
  const validator = React.useMemo(
    () => new NumberValidator(binding, model.decimals),
    [binding, model.decimals]
  );
  const unit = binding?.unit_label ?? '';
  const enabled = ctx
    ? isControllerEditable(ctx.proxy, ctx.userAccessLevel)
    : false;

  const [localEditValue, setLocalEditValue] = React.useState(() =>
    toFloatString(editorValue, model.decimals, binding instanceof FloatBinding)
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [validationState, setValidationState] = React.useState<ValidatorState>(
    ValidatorState.ACCEPTABLE
  );
  const draftRef = React.useRef(localEditValue);
  const changingRef = React.useRef(false);
  const hasDraftRef = React.useRef(false);
  let color: string | undefined;
  if (enabled) {
    color = validationState === ValidatorState.ACCEPTABLE ? 'black' : 'red';
  }

  React.useEffect(() => {
    if (isEditing) {
      return;
    }
    const next = toFloatString(
      editorValue,
      model.decimals,
      binding instanceof FloatBinding
    );
    setLocalEditValue((prev) => (prev === next ? prev : next));
    draftRef.current = next;
    hasDraftRef.current = false;
    setValidationState(ValidatorState.ACCEPTABLE);
  }, [proxy, binding, proxyValue, editorValue, isEditing, model.decimals]);

  React.useEffect(() => {
    if (!proxy || (!hasDraftRef.current && proxy.edit_value === undefined)) {
      return;
    }
    let text = draftRef.current;
    if (!hasDraftRef.current) {
      text = String(getEditorValue(proxy));
    }
    const state = validator.validate(text);
    setValidationState(state);
    changingRef.current = true;
    if (state === ValidatorState.ACCEPTABLE) {
      proxy.edit_value = Number(text);
    } else {
      proxy.edit_value = undefined;
    }
    changingRef.current = false;
  }, [proxy, binding, validator]);

  React.useEffect(() => {
    // Clearing an edit must restore the device text even while focused.
    return proxy?.edit_update(() => {
      if (changingRef.current || proxy.binding !== binding) {
        return;
      }
      const next = toFloatString(
        getEditorValue(proxy),
        model.decimals,
        binding instanceof FloatBinding
      );
      setLocalEditValue(next);
      draftRef.current = next;
      hasDraftRef.current = false;
      setValidationState(ValidatorState.ACCEPTABLE);
    });
  }, [proxy, binding, model.decimals]);

  return (
    <div className="flex items-center gap-1 w-full h-full">
      <input
        data-testid="editable-double-line-edit"
        type="text"
        inputMode="decimal"
        value={localEditValue}
        onFocus={() => {
          setIsEditing(true);
        }}
        onChange={(e) => {
          const text = e.target.value;
          const state = validator.validate(text);
          if (!proxy || !enabled || state === ValidatorState.INVALID) {
            return;
          }
          changingRef.current = true;
          if (state === ValidatorState.ACCEPTABLE) {
            proxy.edit_value = Number(text);
          } else {
            proxy.edit_value = undefined;
          }
          changingRef.current = false;
          // Keep intermediate drafts instead of the formatted edit notification.
          setLocalEditValue(text);
          draftRef.current = text;
          hasDraftRef.current = true;
          setValidationState(state);
        }}
        onBlur={() => {
          setIsEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.currentTarget.blur();
          }
        }}
        disabled={!enabled}
        className={`border border-solid rounded px-1 flex-1 min-w-0 focus:outline-none focus:border-gray-500 ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{
          ...getControllerFontStyle(),
          color,
        }}
        placeholder={enabled ? '' : 'Read-only'}
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
