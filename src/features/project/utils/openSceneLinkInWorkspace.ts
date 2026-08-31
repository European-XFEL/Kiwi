import { readScene, type SceneModel } from '@/karabo/common/api';
import { findSceneModelInProject } from '@/karabo/common/project/api';
import { Capabilities, Hash } from '@/karabo/data/api';
import { showMessageBox } from '@/lib/messagebox';
import { callDeviceSlot } from '@/lib/request';
import {
  getProjectModel,
  getTopology,
  type RequestHandler,
} from '@/lib/singletons/api';
import {
  openUnattachedSceneInWorkspace,
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

export async function openSceneLinkInWorkspace(
  target: string,
  name?: string
): Promise<void> {
  const uuid = sceneUuidFromLinkTarget(target);
  if (!uuid) {
    return;
  }

  let model = findSceneModelInCurrentProject(uuid);
  if (model) {
    openSceneInWorkspace({ model });
  } else {
    // The scene might be an orphan - not connected to the project anymore,
    // but still in the database. Try to retrieve it directly from the
    // ProjectDbManager.
    const result = await _retrieveOrphanScene(uuid);
    if (result) {
      model = result;
      // For orphan scenes the deviceId is the ProjectManager - they are exposed
      // as "scenes from the ProjectManager device".
      model.simple_name = `KaraboProjectDB|${name ?? target})`;
      openUnattachedSceneInWorkspace(model);
    }
  }
}

export async function openDeviceSceneLinkInWorkspace(
  deviceId: string,
  sceneName: string
): Promise<void> {
  console.log(`Opening scene "${sceneName}" of device "${deviceId}" ...`);
  const result = await _retrieveDeviceScene(deviceId, sceneName);
  if (result) {
    // The retrieval was successful - result is a SceneModel
    result.reset_uuid();
    result.simple_name = `${deviceId}|${sceneName}`;
    openUnattachedSceneInWorkspace(result);
  }
}

async function _retrieveDeviceScene(
  deviceId: string,
  sceneName: string
): Promise<SceneModel | undefined> {
  const attrs = getTopology().getDeviceInstanceInfo(deviceId);
  let errorMessage: string | undefined = undefined;
  if (attrs === undefined) {
    errorMessage = `Device "${deviceId}" not online. Cannot retrieve its "${sceneName}" scene.`;
  } else {
    const capabilities = attrs.get('capabilities').value_ as number;
    if (
      capabilities === undefined ||
      (capabilities & Capabilities.PROVIDES_SCENES) !== 1
    ) {
      errorMessage = `Device "${deviceId}" does not provide a scene`;
    }
  }
  if (errorMessage) {
    showMessageBox({
      variant: 'error',
      title: 'Could not open device scene',
      msg: errorMessage,
    });
    console.error(errorMessage);
    return undefined;
  }

  return new Promise((resolve) => {
    const requestId = callDeviceSlot(
      _createRequestSceneHandler(deviceId, sceneName, resolve),
      deviceId,
      'requestScene',
      { name: sceneName }
    );
    console.debug(
      `Token for request of scene "${sceneName}" of device "${deviceId}": ${requestId}`
    );
  });
}

async function _retrieveOrphanScene(
  uuid: string
): Promise<SceneModel | undefined> {
  return new Promise((resolve) => {
    const deviceId = 'KaraboProjectDB'; // Orphan scenes are requested to the ProjectManager
    const requestId = callDeviceSlot(
      _createRequestSceneHandler(deviceId, uuid, resolve),
      deviceId,
      'slotGetScene',
      // NOTE: domain is a legacy from ExistDB and not used internally by
      // the ProjectDBManager - any value will do
      { domain: 'xyz', uuid: uuid }
    );
    console.debug(`Token for request of orphan scene "${uuid}": ${requestId}`);
  });
}

function _createRequestSceneHandler(
  deviceId: string,
  sceneName: string,
  resolve: (scene: SceneModel | undefined) => void
): RequestHandler {
  return (success: boolean, reply: Hash): void => {
    let errorMessage: string | undefined = undefined;
    if (!success) {
      errorMessage = `Request for scene "${sceneName}" of device "${deviceId}" failed: "${reply.value_}"`;
    } else {
      const payload = reply.getValue('payload.data') as string | undefined;
      if (payload) {
        const sceneModel = readScene(payload);
        resolve(sceneModel);
      } else {
        errorMessage = `Reply to request for scene "${sceneName} of device "${deviceId}" had no scene data (empty 'payload.data')`;
      }
    }
    if (errorMessage) {
      showMessageBox({
        variant: 'error',
        title: 'Could not retrieve scene',
        msg: errorMessage,
      });
      console.log(errorMessage);
      resolve(undefined);
    }
  };
}
