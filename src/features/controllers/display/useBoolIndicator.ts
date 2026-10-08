import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type {
  DisplayColorBoolModel,
  DisplayErrorBoolModel,
} from '@/karabo/common/api';
import { getBindingValue } from '../utils/getBindingValue';

export function useBoolIndicator(
  model: DisplayColorBoolModel | DisplayErrorBoolModel,
  ctx: ControllerContainerContext | undefined
) {
  const rawValue = getBindingValue(ctx?.proxy);
  let value: boolean | undefined;
  let valueText = 'Unknown';
  if (rawValue !== undefined) {
    const boolValue = Boolean(rawValue);
    value = boolValue !== model.invert;
    valueText = boolValue ? 'True' : 'False';
  }
  const setTooltip = ctx?.setTooltip;
  const key = ctx?.proxy?.key;
  let tooltip: string | undefined;
  if (key) {
    const prefix = model.invert ? 'Inverted: ' : '';
    tooltip = `${key}\n${prefix}${valueText}`;
  }
  React.useEffect(() => {
    setTooltip?.(tooltip);
    return () => setTooltip?.(undefined);
  }, [setTooltip, tooltip]);

  return value;
}
