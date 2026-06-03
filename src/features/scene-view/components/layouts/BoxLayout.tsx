/**
 * BoxLayout — places children sequentially using flex.
 *
 * Does not self-position. The parent shell owns placement.
 */

import React from 'react';

import { BoxLayoutModel, Direction } from '@/karabo/common/api';
import { renderContent, renderLayerContent } from '../../KaraboSceneWidget';
import { resolveBounds, type SceneLayer } from '../../bounds';
import { containerPointerEvents } from '../../utils/mode';
import { registerRenderer } from '../../renderRegistry';

type BoxLayoutProps = {
  model: BoxLayoutModel;
  layer?: SceneLayer;
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

export const BoxLayout: React.FC<BoxLayoutProps> = ({ model, layer }) => {
  const { direction, children } = model;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: FLEX_DIRECTION_BY_DIRECTION[direction],
        pointerEvents: containerPointerEvents(),
      }}
    >
      {children.map((child, index) => {
        const { width, height } = resolveBounds(child);

        return (
          <div
            key={index}
            style={{
              position: 'relative',
              width,
              height,
              flex: '0 0 auto',
              pointerEvents: containerPointerEvents(),
            }}
          >
            {/* Preserve the active layer through layout recursion. */}
            {layer ? renderLayerContent(child, layer) : renderContent(child)}
          </div>
        );
      })}
    </div>
  );
};

registerRenderer('BoxLayout', BoxLayout);

export default BoxLayout;
