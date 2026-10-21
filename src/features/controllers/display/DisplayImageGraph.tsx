import { type ImageGraphModel, buildModelConfig } from '@/karabo/common/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';

import { ImageToolBar, useImageGraphView } from '../graph/api';

export default function DisplayImageGraph({
  model,
  ctx,
}: {
  model: ImageGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const plotConfig = buildModelConfig(model);
  const view = useImageGraphView({
    proxy: ctx?.proxy,
    plotConfig,
  });
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        ref={view.containerRef}
        role="img"
        aria-label="Image graph"
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          cursor: view.tool === 'pan' ? 'move' : 'default',
        }}
      >
        <div ref={view.stageRef} />
        <div
          ref={view.selectionRef}
          style={{
            display: 'none',
            position: 'absolute',
            border: '1px solid #1674c5',
            background: '#1674c526',
            pointerEvents: 'none',
          }}
        />
      </div>
      <ImageToolBar
        tool={view.tool}
        selectTool={view.selectTool}
        reset={view.reset}
      />
    </div>
  );
}
