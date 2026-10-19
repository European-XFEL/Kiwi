import type { Timestamp } from '@/karabo/data/api';
import type { ImageBinding, NodeBinding } from '@/lib/binding/api';

/** A schema creates the image namespace before the first pixel payload arrives. */
export function hasImageData(binding: ImageBinding): boolean {
  const pixels: NodeBinding | undefined = binding.value.get('pixels');
  const data = pixels?.value.get('data')?.getValue();
  return data != null && data.byteLength !== 0;
}

/** Only expose a frame timestamp once its pixel payload has arrived. */
export function getImageTimestamp(
  binding: ImageBinding
): Timestamp | undefined {
  return hasImageData(binding) ? binding.timestamp : undefined;
}
