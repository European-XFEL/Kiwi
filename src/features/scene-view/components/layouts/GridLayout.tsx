/**
 * GridLayout — places children in a CSS grid using krb:row/col placement.
 */

import React from 'react';

import { GridLayoutModel, GridLayoutChildData } from '@/karabo/common/api';
import { renderContent, renderLayerContent } from '../../KaraboSceneWidget';
import { isLayout, resolveBounds, type SceneLayer } from '../../bounds';
import { containerPointerEvents, objectPointerEvents } from '../../utils/mode';
import {
  getChildObjectId,
  getSceneObjectDomId,
  sceneObjectIdAttr,
} from '../../utils/objectId';
import { registerRenderer } from '../../renderRegistry';

type GridLayoutProps = {
  model: GridLayoutModel;
  objectId: string;
  layer?: SceneLayer;
};

export const GridLayout: React.FC<GridLayoutProps> = ({
  model,
  objectId,
  layer,
}) => {
  const { children } = model;
  const reactId = React.useId();
  // Compute grid dimensions from layout_data so CSS grid auto-sizing works.
  let maxRow = 0;
  let maxCol = 0;
  for (const child of children) {
    if (child.layout_data instanceof GridLayoutChildData) {
      maxRow = Math.max(
        maxRow,
        child.layout_data.row + (child.layout_data.rowspan || 1)
      );
      maxCol = Math.max(
        maxCol,
        child.layout_data.col + (child.layout_data.colspan || 1)
      );
    }
  }

  const hasGrid = maxRow > 0 && maxCol > 0;

  return (
    <div
      id={getSceneObjectDomId('GridLayout', reactId, objectId)}
      {...sceneObjectIdAttr(objectId)}
      style={{
        display: 'grid',
        gridTemplateRows: hasGrid ? `repeat(${maxRow}, auto)` : undefined,
        gridTemplateColumns: hasGrid ? `repeat(${maxCol}, auto)` : undefined,
        width: '100%',
        height: '100%',
        pointerEvents: containerPointerEvents(),
      }}
    >
      {children.map((child, index) => {
        const childObjectId = getChildObjectId(objectId, index);
        const ld =
          child.layout_data instanceof GridLayoutChildData
            ? child.layout_data
            : null;

        const { width: childWidth, height: childHeight } = resolveBounds(child);

        return (
          <div
            key={index}
            id={getSceneObjectDomId('GridLayout-child', reactId, childObjectId)}
            {...sceneObjectIdAttr(childObjectId)}
            style={{
              position: 'relative',
              gridRow: ld
                ? `${ld.row + 1} / span ${ld.rowspan || 1}`
                : undefined,
              gridColumn: ld
                ? `${ld.col + 1} / span ${ld.colspan || 1}`
                : undefined,
              width: childWidth || undefined,
              height: childHeight || undefined,
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

registerRenderer('GridLayout', GridLayout);

export default GridLayout;
