import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Hash } from '@/karabo/data/hash';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { sceneParamsFromURL } from '@/features/navigation/utils';

export default function SceneBootstrap() {
  const location = useLocation();
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    const params = sceneParamsFromURL(location.search);
    if (!params) return;
    // Dedupe on the full param set, not just the uuid: the same scene can be
    // requested from a different host/port/domain/project and must rebroadcast.
    const key = [
      params.host,
      params.port,
      params.domain,
      params.projectName,
      params.uuid,
    ].join('|');
    if (firedRef.current === key) return;
    firedRef.current = key;

    const hash = new Hash();
    hash.set('host', params.host);
    hash.set('port', params.port);
    hash.set('uuid', params.uuid);
    hash.set('domain', params.domain);
    hash.set('project', params.projectName);

    broadcast_event(KaraboEvent.OpenSceneBrowser, hash);
  }, [location.search]);

  return null;
}

export function SceneRouteRedirect() {
  const location = useLocation();
  return <Navigate to={`/main${location.search}`} replace />;
}
