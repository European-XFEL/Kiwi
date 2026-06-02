import React from 'react';

interface SceneViewportProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * SceneViewport — measured, scrollable display area for the scene.
 *
 * Holds the ResizeObserver ref (via containerRef) so useSceneScale
 * can track available space.
 */
export function SceneViewport({
  containerRef,
  className,
  style,
  children,
}: SceneViewportProps) {
  return (
    <div ref={containerRef} className={className} style={style}>
      {children}
    </div>
  );
}
