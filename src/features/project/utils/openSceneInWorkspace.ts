import { SceneModel } from '@/karabo/common/scenemodel/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';

interface OpenSceneInWorkspaceParams {
  model: SceneModel;
}

export function openSceneInWorkspace({
  model,
}: OpenSceneInWorkspaceParams): void {
  broadcast_event(KaraboEvent.OpenScene, { model });
}

export function openUnattachedSceneInWorkspace(model: SceneModel): void {
  broadcast_event(KaraboEvent.OpenUnattachedScene, { model });
}
