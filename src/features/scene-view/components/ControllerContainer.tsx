/**
 * ControllerContainer — layout shell for controller widgets.
 * Manages dimensions and scene interaction mode only.
 */

import React from 'react';
import { useContainer } from '../hooks/useContainer';
import type { ControllerContainerContext } from '../hooks/useController';

export type { ControllerContainerContext };

// ControllerContainerProps
// ---

export interface ControllerContainerProps {
  width: number;
  height: number;
  children: React.ReactNode;
}

// ControllerContainer
// ---

export const ControllerContainer: React.FC<ControllerContainerProps> = ({
  width,
  height,
  children,
}) => {
  const { containerStyle, contentsStyle } = useContainer();

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        ...containerStyle,
      }}
    >
      <div style={contentsStyle}>{children}</div>
    </div>
  );
};
