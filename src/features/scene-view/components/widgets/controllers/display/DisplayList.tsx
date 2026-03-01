/** DisplayList — displays a list/scalar value as a string. Same layout as DisplayLabel. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/ControllerContainer';
import { DisplayListModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { scalarToString } from '@/features/controllers/utils/validation/toStringFormatters';
import { FONT_FAMILY_DEFAULT } from '@/features/controllers/utils/fontDefaults';

// DisplayList
// ----------------------------------------------------------------------------

const DisplayList: React.FC<{
  model: DisplayListModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const value = ctx?.primary?.value;
  const binding = ctx?.primary?.binding;

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
      title={ctx?.tooltipText ?? ctx?.disabledReason}
    >
      {labelValue}
    </div>
  );
};

registerRenderer('DisplayList', DisplayList);

export default DisplayList;
