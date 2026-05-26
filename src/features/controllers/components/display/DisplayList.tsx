/** DisplayList — displays a list/scalar value as a string. Same layout as DisplayLabel. */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { DisplayListModel, FONT_FAMILY_DEFAULT } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/renderRegistry';
import { scalarToString } from '@/karabo/data/api';

// DisplayList
// ----------------------------------------------------------------------------

const DisplayList: React.FC<{
  model: DisplayListModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const value = ctx?.proxy?.value;
  const binding = ctx?.proxy?.binding;

  const labelValue =
    value !== undefined
      ? scalarToString({
          value,
          hashType: binding?.hashType as any,
          unit: binding?.unit_label ?? '',
          floatPrecision: 8,
        })
      : '';

  return (
    <div
      className="overflow-clip flex items-center justify-center border border-solid p-px w-full h-full"
      style={{
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: model.font_size,
        fontWeight: model.font_weight,
      }}
    >
      {labelValue}
    </div>
  );
};

registerRenderer('DisplayList', DisplayList);

export default DisplayList;
