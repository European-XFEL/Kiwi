import { SceneModel } from '@/karabo/common/scenemodel/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { getLogger } from '@/lib/singletons/api';

interface OpenSceneInWorkspaceParams {
  model: SceneModel;
}

export function openSceneInWorkspace({
  model,
}: OpenSceneInWorkspaceParams): void {
  getLogger().info(
    `Loading project scene "${model.simple_name}" (${model.uuid})`
  );
  broadcast_event(KaraboEvent.OpenScene, { model });
}

export function openUnattachedSceneInWorkspace(model: SceneModel): void {
  broadcast_event(KaraboEvent.OpenUnattachedScene, { model });
}
