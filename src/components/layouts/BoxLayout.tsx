import React from "react";

interface BoxLayoutProps {
  x: number;
  y: number;
  width: number;
  height: number;
  direction?: number;
}

/**
 * BoxLayout visual container
 * Renders a visible container box for BoxLayout elements
 */
const BoxLayout: React.FC<BoxLayoutProps> = (props) => {
  return (
    <div
      className="absolute border border-gray-300"
      style={{
        left: props.x,
        top: props.y,
        width: props.width,
        height: props.height,
        boxSizing: "border-box",
      }}
    />
  );
};

export default BoxLayout;
