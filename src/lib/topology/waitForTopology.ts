import { getTopology } from '@/lib/singletons/api';

export function waitForTopology(
  isCancelled: () => boolean,
  intervalMs = 100
): Promise<boolean> {
  if (getTopology().initialized) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const poll = setInterval(() => {
      if (isCancelled()) {
        clearInterval(poll);
        resolve(false);
        return;
      }

      if (getTopology().initialized) {
        clearInterval(poll);
        resolve(true);
      }
    }, intervalMs);
  });
}
