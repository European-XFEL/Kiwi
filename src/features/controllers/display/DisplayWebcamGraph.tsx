import { useEffect, useRef, useState } from 'react';
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
  const { canvasRef, imageSize } = useWebcam(ctx?.proxy, model.colormap);
  const viewRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewSize((current) => {
        if (current.width === width && current.height === height) {
          return current;
        }
        return { width, height };
      });
    });
    observer.observe(view);
    return () => observer.disconnect();
  }, []);
  // object-fit centers the image within the canvas's full-size element box.
  const scale = Math.min(
    viewSize.width / imageSize.width,
    viewSize.height / imageSize.height
  );
  const imageWidth = imageSize.width * scale;
  const imageHeight = imageSize.height * scale;
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
      <div
        ref={viewRef}
        style={{ position: 'absolute', inset: IMAGE_VIEW_INSET }}
      >
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
        <div
          style={{
            position: 'absolute',
            left: (viewSize.width - imageWidth) / 2,
            top: (viewSize.height - imageHeight) / 2,
            width: imageWidth,
            height: imageHeight,
            display: imageWidth > 0 && imageHeight > 0 ? undefined : 'none',
            pointerEvents: 'none',
          }}
        >
          <WebcamLiveIndicator timestamp={timestamp} />
        </div>
      </div>
    </div>
  );
}
