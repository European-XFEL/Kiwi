import React from 'react';

export interface ScenePanelViewportProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function ScenePanelViewport({
  containerRef,
  className,
  style,
  children,
}: ScenePanelViewportProps) {
  return (
    <div
      data-testid="scene-panel-viewport"
      ref={containerRef}
      className={['min-h-0 min-w-0 flex-1 bg-muted', className ?? '']
        .join(' ')
        .trim()}
      style={style}
    >
      {children}
    </div>
  );
}

export default ScenePanelViewport;
