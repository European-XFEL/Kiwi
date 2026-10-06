/** DisplayColorBool — colour indicator driven by a boolean device property. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DisplayColorBoolModel } from '@/karabo/common/api';
import { getBindingValue } from '../utils/getBindingValue';
import getStateColor from '@/lib/Indicators';

function toBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return undefined;
}

const DisplayColorBool: React.FC<{
  model: DisplayColorBoolModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const value = toBool(getBindingValue(ctx?.proxy));
  let backgroundColor = 'transparent';
  if (value !== undefined) {
    if (!model.invert) {
      backgroundColor = value
        ? getStateColor('ACTIVE')
        : getStateColor('PASSIVE');
    } else {
      backgroundColor = value
        ? getStateColor('PASSIVE')
        : getStateColor('ACTIVE');
    }
  }

  return (
    <div
      data-testid="display-color-bool"
      className="flex items-center justify-center overflow-hidden w-full h-full"
    >
      <svg aria-hidden="true" className="w-full h-full" viewBox="0 0 100 100">
        <circle
          cx="50%"
          cy="50%"
          r="48%"
          fill={backgroundColor}
          stroke="black"
          strokeWidth="4%"
        />
      </svg>
    </div>
  );
};

export default DisplayColorBool;
