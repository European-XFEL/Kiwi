/**
 * FixedLayout — positions itself in the scene and renders children
 * at fixed offsets (x, y) inside the layout.
 */

import React from 'react';

import { FixedLayoutModel } from '@/karabo-common/models/layouts';
import { ElementRenderer } from '@/karabo-common/render/ElementRenderer';
import { registerRenderer } from '@/karabo-common/render/registry';

type FixedLayoutProps = {
  model: FixedLayoutModel;
};

export const FixedLayout: React.FC<FixedLayoutProps> = ({ model }) => {
  const { x, y, width, height, children } = model;

  return (
    <div
      style={{
        position: 'absolute', // anchor the layout inside the scene
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {children.map((child, index) => {
        const childGeometry = child as {
          x: number;
          y: number;
          width: number;
          height: number;
        };

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${childGeometry.x - x}px`, // relative to layout origin
              top: `${childGeometry.y - y}px`,
              width: `${childGeometry.width}px`,
              height: `${childGeometry.height}px`,
            }}
          >
            <ElementRenderer model={child} />
          </div>
        );
      })}
    </div>
  );
};

registerRenderer('FixedLayout', FixedLayout);

export default FixedLayout;
