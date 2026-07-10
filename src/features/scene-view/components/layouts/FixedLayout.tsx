/**
 * FixedLayout — renders children at fixed offsets relative to itself.
 */

import React from 'react';

import { FixedLayoutModel } from '@/karabo/common/api';
import { renderContent, renderLayerContent } from '../../KaraboSceneWidget';
import { isLayout, resolveBounds, type SceneLayer } from '../../bounds';
import { containerPointerEvents, objectPointerEvents } from '../../utils/mode';
import {
  getChildObjectId,
  getSceneObjectDomId,
  sceneObjectIdAttr,
} from '../../utils/objectId';
import { registerRenderer } from '../../renderRegistry';

type FixedLayoutProps = {
  model: FixedLayoutModel;
  objectId: string;
  layer?: SceneLayer;
};

export const FixedLayout: React.FC<FixedLayoutProps> = ({
  model,
  objectId,
  layer,
}) => {
  const { x, y, children } = model;
  const reactId = React.useId();
  return (
    <div
      id={getSceneObjectDomId('FixedLayout', reactId, objectId)}
      {...sceneObjectIdAttr(objectId)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        pointerEvents: containerPointerEvents(),
      }}
    >
      {children.map((child, index) => {
        const childObjectId = getChildObjectId(objectId, index);
        const {
          x: childX,
          y: childY,
          width: childWidth,
          height: childHeight,
        } = resolveBounds(child);

        return (
          <div
            key={index}
            id={getSceneObjectDomId(
              'FixedLayout-child',
              reactId,
              childObjectId
            )}
            {...sceneObjectIdAttr(childObjectId)}
            style={{
              position: 'absolute',
              left: childX - x,
              top: childY - y,
              width: childWidth,
              height: childHeight,
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

registerRenderer('FixedLayout', FixedLayout);

export default FixedLayout;
