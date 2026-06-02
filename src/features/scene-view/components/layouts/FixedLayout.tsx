/**
 * FixedLayout — renders children at fixed offsets relative to itself.
 */

import React from 'react';

import { FixedLayoutModel } from '@/karabo/common/api';
import { renderContent } from '../../KaraboSceneWidget';
import { resolveBounds, type RenderPhase } from '../../bounds';
import { containerPointerEvents } from '../../utils/mode';
import { registerRenderer } from '../../renderRegistry';

type FixedLayoutProps = {
  model: FixedLayoutModel;
  phase?: RenderPhase;
};

export const FixedLayout: React.FC<FixedLayoutProps> = ({
  model,
  phase = 'all',
}) => {
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
            {/* Preserve the active pass through layout recursion. */}
            {renderContent(child, phase)}
          </div>
        );
      })}
    </div>
  );
};

registerRenderer('FixedLayout', FixedLayout);

export default FixedLayout;
