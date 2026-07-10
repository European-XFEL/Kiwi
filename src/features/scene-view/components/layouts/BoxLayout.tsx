/**
 * BoxLayout — places children sequentially using flex.
 *
 * Does not self-position. The parent shell owns placement.
 */

import React from 'react';

import { BoxLayoutModel, Direction } from '@/karabo/common/api';
import { renderContent, renderLayerContent } from '../../KaraboSceneWidget';
import { isLayout, resolveBounds, type SceneLayer } from '../../bounds';
import { containerPointerEvents, objectPointerEvents } from '../../utils/mode';
import {
  getChildObjectId,
  getSceneObjectDomId,
  sceneObjectIdAttr,
} from '../../utils/objectId';
import { registerRenderer } from '../../renderRegistry';

type BoxLayoutProps = {
  model: BoxLayoutModel;
  objectId: string;
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

export const BoxLayout: React.FC<BoxLayoutProps> = ({
  model,
  objectId,
  layer,
}) => {
  const { direction, children } = model;
  const reactId = React.useId();
  return (
    <div
      id={getSceneObjectDomId('BoxLayout', reactId, objectId)}
      {...sceneObjectIdAttr(objectId)}
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
        const childObjectId = getChildObjectId(objectId, index);

        return (
          <div
            key={index}
            id={getSceneObjectDomId('BoxLayout-child', reactId, childObjectId)}
            {...sceneObjectIdAttr(childObjectId)}
            style={{
              position: 'relative',
              width,
              height,
              flex: '0 0 auto',
              // A leaf child is a hit target; a nested layout child stays
              // transparent so its own children win the hit.
              pointerEvents: isLayout(child)
                ? containerPointerEvents()
                : objectPointerEvents(),
            }}
          >
            {/* Preserve the active layer through layout recursion. */}
            {layer
              ? renderLayerContent(child, layer, childObjectId)
              : renderContent(child, childObjectId)}
          </div>
        );
      })}
    </div>
  );
};

registerRenderer('BoxLayout', BoxLayout);

export default BoxLayout;
