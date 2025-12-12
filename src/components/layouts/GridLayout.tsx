import React from 'react';

interface GridLayoutProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * GridLayout visual container
 * Renders a visible container box for GridLayout elements
 */
const GridLayout: React.FC<GridLayoutProps> = (props) => {
  return (
    <div
      className="absolute border border-gray-300"
      style={{
        left: props.x,
        top: props.y,
        width: props.width,
        height: props.height,
        boxSizing: 'border-box',
      }}
    />
  );
};

export default GridLayout;
