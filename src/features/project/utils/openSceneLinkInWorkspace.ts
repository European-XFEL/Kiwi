import { findSceneModelInProject } from '@/karabo/common/project/api';
import { type SceneModel } from '@/karabo/common/scenemodel/api';
import { showMessageBox } from '@/lib/messagebox';
import { retrieveDeviceScene } from '@/lib/request';
import { getProjectModel } from '@/lib/singletons/api';
import {
  openDeviceSceneInWorkspace,
  openSceneInWorkspace,
} from './openSceneInWorkspace';

export function sceneUuidFromLinkTarget(target: string): string {
  const colonIdx = target.indexOf(':');
  return colonIdx >= 0 ? target.slice(colonIdx + 1) : target;
}

export function findSceneModelInCurrentProject(
  uuid: string
): SceneModel | undefined {
  const root = getProjectModel().root;
  if (!root) {
    return;
  }

  return findSceneModelInProject(root, uuid);
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

export async function openDeviceSceneLinkInWorkspace(
  deviceId: string,
  sceneName: string
): Promise<void> {
  console.log(`Opening scene "${sceneName}" of device "${deviceId}" ...`);
  const result = await retrieveDeviceScene(deviceId, sceneName);
  if (typeof result === 'string') {
    showMessageBox({
      variant: 'error',
      title: 'Could not open device scene',
      msg: result,
    });
    return;
  }
  openDeviceSceneInWorkspace(result);
}
