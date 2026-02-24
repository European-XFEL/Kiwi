/**
 * FixedLayout — renders children at fixed offsets relative to itself.
 */

import React from 'react';

import { FixedLayoutModel } from '@/karabo-common/models/layouts';
import { renderContent } from '@/karabo-common/render/ElementRenderer';
import { resolveBounds } from '@/karabo-common/render/bounds';
import { containerPointerEvents } from '@/karabo-common/scene_view/mode';
import { registerRenderer } from '@/karabo-common/render/registry';

type FixedLayoutProps = {
  model: FixedLayoutModel;
};

export const FixedLayout: React.FC<FixedLayoutProps> = ({ model }) => {
  const { x, y, children } = model;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        pointerEvents: containerPointerEvents(),
      }}
    >
      {children.map((child, index) => {
        const {
          x: childX,
          y: childY,
          width: childWidth,
          height: childHeight,
        } = resolveBounds(child);

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: childX - x,
              top: childY - y,
              width: childWidth,
              height: childHeight,
              pointerEvents: containerPointerEvents(),
            }}
          >
            {renderContent(child)}
          </div>
        );
      })}
    </div>
  );
};

registerRenderer('FixedLayout', FixedLayout);

export default FixedLayout;
