import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Hash } from '@/karabo/data/hash';
import { HashType } from '@/karabo/data/typenums';
import { broadcast_event, KaraboEvent } from '@/lib/events';

interface OpenSceneInWorkspaceParams {
  model: SceneModel;
}

function sceneModelHashValue(model: SceneModel) {
  return { type_: HashType.None_, value_: model };
}

export function openSceneInWorkspace({
  model,
}: OpenSceneInWorkspaceParams): void {
  const hash = new Hash();
  hash.set('model', sceneModelHashValue(model));
  broadcast_event(KaraboEvent.OpenScene, hash);
}
