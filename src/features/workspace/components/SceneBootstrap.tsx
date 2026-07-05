import { useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { sceneParamsFromURL } from '@/features/navigation/utils';
import { startSceneFromRoute } from '@/features/project/api';
import type { SceneRouteLoadHandle } from '@/features/project/api';
import { waitForTopology } from '@/lib/topology/api';
import { useActiveSceneStore } from '@/features/scene-view/hooks/useActiveScene';

export default function SceneBootstrap() {
  const location = useLocation();
  const navigate = useNavigate();
  const openedRef = useRef<string | null>(null);
  const setSceneLoadPending = useActiveSceneStore(
    (state) => state.setSceneLoadPending
  );

  useEffect(() => {
    const params = sceneParamsFromURL(location.search);
    if (!params) {
      setSceneLoadPending(false);
      return;
    }

    const key = [
      params.host,
      params.port,
      params.domain,
      params.projectUuid,
      params.sceneUuid,
    ].join('|');
    if (openedRef.current === key) return;

    setSceneLoadPending(true);

    // `waitForTopology` only polls readiness, so a boolean is enough to stop
    // that wait when this effect is cleaned up before topology is available.
    let cancelled = false;
    let handle: SceneRouteLoadHandle | undefined;

    // The callbacks below run in promise order: wait for topology, then start
    // the scene load, then mark this route as opened or handle the failure.
    waitForTopology(() => cancelled)
      .then((topologyReady) => {
        if (!topologyReady || cancelled) {
          return;
        }

        // The actual project/scene loading owns its own AbortController via
        // the returned handle. This is the part that can still be aborted after
        // topology is ready.
        handle = startSceneFromRoute(params);
        return handle.promise;
      })
      .then(() => {
        if (!cancelled && !handle?.controller.signal.aborted) {
          openedRef.current = key;
        }
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
        navigate('/main', { replace: true });
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
  }, [location.search, navigate, setSceneLoadPending]);

  return null;
}

export function SceneRouteRedirect() {
  const location = useLocation();
  return <Navigate to={`/main${location.search}`} replace />;
}
