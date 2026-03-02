import React from 'react';

interface SceneStageProps {
  width: number;
  height: number;
  scale: number;
  children: React.ReactNode;
}

/**
 * SceneStage — the only element that scales.
 *
 * Fixed to the scene's authored dimensions (from XML width/height).
 * All widgets are absolutely positioned children — they never move.
 * Overflow is hidden to clip anything outside the canvas boundary.
 */
export function SceneStage({
  width,
  height,
  scale,
  children,
}: SceneStageProps) {
  return (
    <div
      className="relative bg-[#eeeeee] shadow-lg rounded-md"
      style={{
        width,
        height,
        overflow: 'hidden',
        transform: `scale(${scale})`,
        transformOrigin: '0 0',
      }}
    >
      {children}
    </div>
  );
}
