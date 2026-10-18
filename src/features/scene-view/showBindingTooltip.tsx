import { createRoot } from 'react-dom/client';
import type { PropertyProxy } from '@/lib/binding/api';
import { SceneBindingTooltip } from './components/SceneBindingTooltip';

let dismissActiveTooltip: (() => void) | undefined;

export function showBindingTooltip({
  proxy,
  clientX,
  clientY,
}: {
  proxy: PropertyProxy;
  clientX: number;
  clientY: number;
}): () => void {
  dismissActiveTooltip?.();
  const container = document.createElement('div');
  (document.fullscreenElement ?? document.body).append(container);
  const root = createRoot(container);
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) {
      return;
    }
    dismissed = true;
    if (dismissActiveTooltip === dismiss) {
      dismissActiveTooltip = undefined;
    }
    // Scene effects can dismiss during a React commit. Unmount after it finishes.
    void Promise.resolve().then(() => {
      root.unmount();
      container.remove();
    });
  };
  dismissActiveTooltip = dismiss;
  root.render(
    <SceneBindingTooltip
      proxy={proxy}
      clientX={clientX}
      clientY={clientY}
      onDismiss={dismiss}
    />
  );
  return dismiss;
}
