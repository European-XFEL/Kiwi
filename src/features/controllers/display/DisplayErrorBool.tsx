import React from 'react';
import icons from '@/assets/icons';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { DisplayErrorBoolModel } from '@/karabo/common/api';
import { useBoolIndicator } from './useBoolIndicator';

const DisplayErrorBool: React.FC<{
  model: DisplayErrorBoolModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const value = useBoolIndicator(model, ctx);
  let icon = icons.unknownBool;
  if (value !== undefined) {
    icon = value ? icons.okBool : icons.errorBool;
  }
  return (
    <div
      data-testid="display-error-bool"
      className="flex items-center justify-center w-full h-full overflow-hidden"
    >
      <img
        src={icon}
        alt=""
        className="w-full h-full max-w-6 max-h-6"
        style={{ objectFit: 'fill' }}
      />
    </div>
  );
};

export default DisplayErrorBool;
