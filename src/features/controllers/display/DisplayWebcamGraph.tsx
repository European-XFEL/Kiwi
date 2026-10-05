import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { WebCamGraphModel } from '@/karabo/common/api';
import { ImageBinding } from '@/lib/binding/api';
import { useWebcam } from '../graph/image/useWebcam';
import { getImageTimestamp } from '../graph/image/pixels';
import { WebcamLiveIndicator } from '../graph/image/WebcamLiveIndicator';

const IMAGE_VIEW_INSET = '5%';

export default function DisplayWebcamGraph({
  model,
  ctx,
}: {
  model: WebCamGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const canvasRef = useWebcam(ctx?.proxy, model.colormap);
  const binding = ctx?.proxy?.binding;
  const timestamp =
    binding instanceof ImageBinding ? getImageTimestamp(binding) : undefined;
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <div style={{ position: 'absolute', inset: IMAGE_VIEW_INSET }}>
        <canvas
          ref={canvasRef}
          aria-label="Webcam image"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
          }}
        />
        <WebcamLiveIndicator timestamp={timestamp} />
      </div>
    </div>
  );
}
