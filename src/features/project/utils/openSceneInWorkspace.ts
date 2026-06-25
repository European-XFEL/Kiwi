import { Hash } from '@/karabo/data/hash';
import { broadcast_event, KaraboEvent } from '@/lib/events';

interface OpenSceneInWorkspaceParams {
  domain?: string;
  projectName?: string;
  uuid: string;
  name?: string;
}

export function openSceneInWorkspace({
  domain,
  projectName,
  uuid,
  name,
}: OpenSceneInWorkspaceParams): void {
  const hash = new Hash();
  hash.set('uuid', uuid);

  if (domain) {
    hash.set('domain', domain);
  }

  if (projectName) {
    hash.set('project', projectName);
  }

  if (name) {
    hash.set('name', name);
  }

  broadcast_event(KaraboEvent.OpenScene, hash);
}
