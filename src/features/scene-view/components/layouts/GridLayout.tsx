/**
 * GridLayout — places children in a CSS grid using krb:row/col placement.
 */

import React from 'react';

import { GridLayoutModel, GridLayoutChildData } from '@/karabo/common/api';
import { renderContent, renderLayerContent } from '../../KaraboSceneWidget';
import { resolveBounds, type SceneLayer } from '../../bounds';
import { containerPointerEvents } from '../../utils/mode';
import { registerRenderer } from '../../renderRegistry';

type GridLayoutProps = {
  model: GridLayoutModel;
  layer?: SceneLayer;
};

export const GridLayout: React.FC<GridLayoutProps> = ({ model, layer }) => {
  const { children } = model;

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
        const ld =
          child.layout_data instanceof GridLayoutChildData
            ? child.layout_data
            : null;

        const { width: childWidth, height: childHeight } = resolveBounds(child);

        return (
          <div
            key={index}
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

registerRenderer('GridLayout', GridLayout);

export default GridLayout;
