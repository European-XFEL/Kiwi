import { useEffect, useRef, useState } from 'react';
import { ImageBinding, type PropertyProxy } from '@/lib/binding/api';
import { getFrame, hasImageData } from './pixels';

const PLACEHOLDER_WIDTH_PX = 640;
const PLACEHOLDER_HEIGHT_PX = 480;
const PLACEHOLDER_FONT_SIZE_PX = 72;
const PLACEHOLDER_TEXT_PADDING_PX = 20;
const PLACEHOLDER_BORDER_WIDTH_PX = 2;

function resizeCanvas(
  canvas: HTMLCanvasElement,
  frame: Pick<ImageData, 'width' | 'height'>
): boolean {
  const widthChanged = canvas.width !== frame.width;
  const heightChanged = canvas.height !== frame.height;
  // Assigning even the same dimensions clears and reallocates the canvas.
  if (widthChanged) {
    canvas.width = frame.width;
  }
  if (heightChanged) {
    canvas.height = frame.height;
  }
  return widthChanged || heightChanged;
}

function hasMatchingDimensions(
  image: ImageData,
  frame: Pick<ImageData, 'width' | 'height'>
): boolean {
  return image.width === frame.width && image.height === frame.height;
}

/** Use a fixed aspect ratio so the placeholder fits the same way as a frame. */
function drawPlaceholder(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  text: string
) {
  canvas.width = PLACEHOLDER_WIDTH_PX;
  canvas.height = PLACEHOLDER_HEIGHT_PX;
  context.fillStyle = '#ccc';
  context.fillRect(0, 0, canvas.width, canvas.height);
  // Inset the stroke by half its width so the entire border stays visible.
  const borderInset = PLACEHOLDER_BORDER_WIDTH_PX / 2;
  context.strokeStyle = '#000';
  context.lineWidth = PLACEHOLDER_BORDER_WIDTH_PX;
  context.strokeRect(
    borderInset,
    borderInset,
    canvas.width - PLACEHOLDER_BORDER_WIDTH_PX,
    canvas.height - PLACEHOLDER_BORDER_WIDTH_PX
  );
  context.fillStyle = '#333';
  context.font = `bold ${PLACEHOLDER_FONT_SIZE_PX}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(
    text,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width - 2 * PLACEHOLDER_TEXT_PADDING_PX
  );
}

export function useWebcam(proxy: PropertyProxy | undefined, colormap: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<ImageData | undefined>(undefined);
  const [imageSize, setImageSize] = useState({
    width: PLACEHOLDER_WIDTH_PX,
    height: PLACEHOLDER_HEIGHT_PX,
  });
  useEffect(() => {
    const pending = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) {
        return;
      }
      // Each drawing branch calls this once. Reusing unchanged size state lets
      // React skip an overlay render for steady-size frames.
      const updateImageSize = () => {
        const { width, height } = canvas;
        setImageSize((current) => {
          if (current.width === width && current.height === height) {
            return current;
          }
          return { width, height };
        });
      };
      const binding = proxy?.binding;
      if (!(binding instanceof ImageBinding) || !hasImageData(binding)) {
        drawPlaceholder(canvas, context, 'Image');
        updateImageSize();
        return;
      }
      const frame = getFrame(binding, colormap, imageRef.current?.data);
      if (!frame) {
        drawPlaceholder(canvas, context, 'Unsupported Encoding');
        updateImageSize();
        return;
      }
      resizeCanvas(canvas, frame);
      let image = imageRef.current;
      if (!image || !hasMatchingDimensions(image, frame)) {
        image = context.createImageData(frame.width, frame.height);
        imageRef.current = image;
      }
      // Steady-size frames were converted directly into the cached ImageData.
      if (image.data !== frame.pixels) {
        image.data.set(frame.pixels);
      }
      context.putImageData(image, 0, 0);
      updateImageSize();
    });
    return () => cancelAnimationFrame(pending);
  });
  return { canvasRef, imageSize };
}
