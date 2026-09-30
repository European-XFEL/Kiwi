/**
 * BoxLayout — places children sequentially using flex.
 *
 * Does not self-position. The parent shell owns placement.
 */

import React from 'react';

import { BoxLayoutModel, Direction } from '@/karabo/common/api';
import { renderContent } from '../../KaraboSceneWidget';
import { isLayout, isShape, resolveBounds } from '../../bounds';
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

export const BoxLayout: React.FC<BoxLayoutProps> = React.memo(
  ({ model, objectId }) => {
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
              id={getSceneObjectDomId(
                'BoxLayout-child',
                reactId,
                childObjectId
              )}
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
                zIndex: isShape(child) ? -1 : undefined,
              }}
            >
              {renderContent(child, childObjectId)}
            </div>
          );
        })}
      </div>
    );
  }
);

registerRenderer('BoxLayout', BoxLayout);

export default BoxLayout;
