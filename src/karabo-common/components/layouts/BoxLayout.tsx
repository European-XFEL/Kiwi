/**
 * BoxLayout — places its children sequentially (flex) via ElementRenderer.
 */

import React from 'react';

import { BoxLayoutModel, Direction } from '@/karabo-common/models/layouts';
import { ElementRenderer } from '@/karabo-common/render/ElementRenderer';
import { registerRenderer } from '@/karabo-common/render/registry';

type BoxLayoutProps = {
  model: BoxLayoutModel;
};

const FLEX_DIRECTION_BY_DIRECTION: Record<
  Direction,
  React.CSSProperties['flexDirection']
> = {
  [Direction.LeftToRight]: 'row',
  [Direction.RightToLeft]: 'row-reverse',
  [Direction.TopToBottom]: 'column',
  [Direction.BottomToTop]: 'column-reverse',
};

export const BoxLayout: React.FC<BoxLayoutProps> = ({ model }) => {
  const { x, y, width, height, direction, children } = model;

  return (
    <div
      style={{
        position: 'absolute', // anchor this layout in the scene
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        flexDirection: FLEX_DIRECTION_BY_DIRECTION[direction],
      }}
    >
      {children.map((child, index) => (
        <ElementRenderer key={index} model={child} />
      ))}
    </div>
  );
};

registerRenderer('BoxLayout', BoxLayout);

export default BoxLayout;
