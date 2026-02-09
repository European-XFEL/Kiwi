import React from 'react';

interface FixedLayoutProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * FixedLayout visual container
 * Renders a visible container box for FixedLayout elements
 */
const FixedLayout: React.FC<FixedLayoutProps> = (props) => {
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

export default FixedLayout;
