import React from 'react';
import icons from '@/assets/icons';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { DisplayIconCommandModel } from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/api';
import { isControllerExecutable } from '../utils/controller_semantics';

const commandIcons = new Map<string, string>([
  ['Left', icons.arrowFancyLeft],
  ['Right', icons.arrowFancyRight],
  ['Up', icons.arrowFancyUp],
  ['Down', icons.arrowFancyDown],
  ['Start', icons.mediaStart],
  ['Stop', icons.mediaStop],
  ['Pause', icons.mediaPause],
  ['Reset', icons.mediaBackward],
  ['Acquire', icons.mediaRecord],
  ['On', icons.on],
  ['Off', icons.off],
  ['Abort', icons.stop],
  ['Halt', icons.halt],
]);

const DisplayIconCommand: React.FC<{
  model: DisplayIconCommandModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const proxy = ctx?.proxy;
  const isEnabled = isControllerExecutable(
    proxy,
    ctx?.userAccessLevel ?? AccessLevel.OBSERVER
  );
  const caption = proxy?.binding?.displayedName || proxy?.path || 'NO TEXT';

  return (
    <button
      type="button"
      aria-label={`Command: ${caption}`}
      disabled={!isEnabled}
      className="block rounded-sm border-0 bg-transparent enabled:hover:bg-black/10 enabled:active:bg-black/20 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:cursor-default disabled:opacity-40"
      style={{
        width: '100%',
        height: '100%',
        minWidth: 20,
        minHeight: 20,
        padding: 1,
        boxSizing: 'border-box',
      }}
      onClick={() => {
        if (proxy && isEnabled) proxy.execute();
      }}
    >
      <img
        src={commandIcons.get(model.icon_name) ?? icons.imageMissing}
        alt=""
        draggable={false}
        className="pointer-events-none"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </button>
  );
};

export default DisplayIconCommand;
