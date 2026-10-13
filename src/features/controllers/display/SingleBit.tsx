import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { SingleBitModel } from '@/karabo/common/api';
import { getStateColor } from '@/lib/Indicators';
import { getBindingValue } from '../utils/getBindingValue';

const SingleBit: React.FC<{
  model: SingleBitModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const value = getBindingValue(ctx?.proxy);
  let backgroundColor = 'transparent';
  if (
    Number.isSafeInteger(model.bit) &&
    model.bit >= 0 &&
    (typeof value === 'bigint' ||
      (typeof value === 'number' && Number.isSafeInteger(value)))
  ) {
    const bitSet = ((BigInt(value) >> BigInt(model.bit)) & 1n) === 1n;
    backgroundColor = getStateColor(
      bitSet !== model.invert ? 'ACTIVE' : 'PASSIVE'
    );
  }

  return (
    <div
      data-testid="single-bit"
      className="w-full h-full overflow-hidden"
      style={{
        boxSizing: 'border-box',
        border: '2px solid black',
        borderRadius: '6px',
        backgroundColor,
      }}
    />
  );
};

export default SingleBit;
