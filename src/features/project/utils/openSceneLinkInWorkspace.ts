import { SceneModel } from '@/karabo/common/scenemodel/api';
import { getProjectModel } from '@/lib/singletons/api';
import { openSceneInWorkspace } from './openSceneInWorkspace';

export function sceneUuidFromLinkTarget(target: string): string {
  const colonIdx = target.indexOf(':');
  return colonIdx >= 0 ? target.slice(colonIdx + 1) : target;
}

export function findSceneModelInCurrentProject(
  uuid: string
): SceneModel | undefined {
  const scenes = getProjectModel().root?.scenes ?? [];
  return scenes.find(
    (scene): scene is SceneModel =>
      scene instanceof SceneModel && scene.uuid === uuid
  );
}

export function openSceneLinkInWorkspace(target: string): void {
  const uuid = sceneUuidFromLinkTarget(target);
  if (!uuid) {
    return;
  }

  const model = findSceneModelInCurrentProject(uuid);
  if (!model) {
    return;
  }

  openSceneInWorkspace({ model });
}
