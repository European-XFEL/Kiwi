import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { loadRootProjectFromBookmark } from '@/features/project/api';
import type { RootProjectLoadHandle } from '@/features/project/api';
import { getPanelWrangler } from '@/lib/singletons/api';
import { waitForTopology } from '@/lib/topology/api';
import { useActiveSceneStore } from '@/features/scene-view/hooks/useActiveScene';

export default function SceneBootstrap() {
  const setSceneLoadPending = useActiveSceneStore(
    (state) => state.setSceneLoadPending
  );

  useEffect(() => {
    const panelWrangler = getPanelWrangler();
    const savedTab = panelWrangler.getSavedActiveTab();
    if (!savedTab) return;

    setSceneLoadPending(true);

    // `waitForTopology` only polls readiness, so a boolean is enough to stop
    // that wait when this effect is cleaned up before topology is available.
    let cancelled = false;
    let handle: RootProjectLoadHandle | undefined;

    // The callbacks below run in promise order: wait for topology, then start
    // the scene load, then handle the failure.
    waitForTopology(() => cancelled)
      .then((topologyReady) => {
        if (!topologyReady || cancelled) {
          return;
        }

        // The actual project/scene loading owns its own AbortController via
        // the returned handle. This is the part that can still be aborted after
        // topology is ready.
        handle = loadRootProjectFromBookmark(savedTab);
        return handle.promise;
      })
      .catch((error: unknown) => {
        if (cancelled || handle?.controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'The scene could not be loaded.';
        console.error(message);
        // A scene that cannot be opened must not fail again on the next reload.
        panelWrangler.clearSavedActiveTab();
      })
      .finally(() => {
        if (!cancelled && !handle?.controller.signal.aborted) {
          setSceneLoadPending(false);
        }
      });

    return () => {
      // Stop a pending topology wait and abort the scene load if it has started.
      cancelled = true;
      handle?.abort();
      setSceneLoadPending(false);
    };
  }, [setSceneLoadPending]);

  return null;
}

export function SceneRouteRedirect() {
  const location = useLocation();
  return <Navigate to={`/main${location.search}`} replace />;
}
