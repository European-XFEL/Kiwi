/**
 * ControllerContainer — overlay/presentation wrapper for controller widgets.
 */

import React from 'react';
import { PropertyOverlay } from '@/features/scene_view/components/PropertyOverlay';
import { containerPointerEvents, contentsWrapperStyle } from './mode';
import {
  useControllerState,
  type ControllerContainerContext,
} from './hook/useControllerState';

export type { ControllerContainerContext };

// ControllerContainerProps
// ---

export interface ControllerContainerProps {
  keys: string[];
  width: number;
  height: number;
  children: (ctx: ControllerContainerContext) => React.ReactNode;
}

// ControllerContainer
// ---

export const ControllerContainer: React.FC<ControllerContainerProps> = ({
  keys,
  width,
  height,
  children,
}) => {
  const ctx = useControllerState(keys);

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        pointerEvents: containerPointerEvents(),
      }}
    >
      <div style={contentsWrapperStyle()}>{children(ctx)}</div>
      <PropertyOverlay
        primary={ctx.primary}
        x={0}
        y={0}
        width={width}
        height={height}
      />
    </div>
  );
};
