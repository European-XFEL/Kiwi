import { type WebCamGraphModel, buildModelConfig } from '@/karabo/common/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';

import { ImageBinding, ProxyStatus } from '@/lib/binding/api';

import {
  useImageGraphView,
  getImageTimestamp,
  WebcamLiveIndicator,
} from '../graph/api';

const IMAGE_VIEW_INSET = '5%';

export default function DisplayWebcamGraph({
  model,
  ctx,
}: {
  model: WebCamGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const plotConfig = buildModelConfig(model);
  const view = useImageGraphView({
    proxy: ctx?.proxy,
    plotConfig,
    imageOnly: true,
  });
  const binding = ctx?.proxy?.binding;
  const timestamp =
    ctx?.proxy?.root.status !== ProxyStatus.OFFLINE &&
    binding instanceof ImageBinding
      ? getImageTimestamp(binding)
      : undefined;
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        ref={view.containerRef}
        role="img"
        aria-label="Webcam image"
        style={{ position: 'absolute', inset: IMAGE_VIEW_INSET }}
      >
        <div ref={view.stageRef} />
        <div
          ref={view.overlayRef}
          style={{
            position: 'absolute',
            display: 'none',
            pointerEvents: 'none',
          }}
        >
          <WebcamLiveIndicator timestamp={timestamp} />
        </div>
      </div>
    </div>
  );
}
