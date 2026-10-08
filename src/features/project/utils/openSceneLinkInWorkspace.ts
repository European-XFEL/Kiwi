import { type SceneModel } from '@/karabo/common/api';
import { findSceneModelInProject } from '@/karabo/common/project/api';
import { Capabilities } from '@/karabo/data/api';
import { showMessageBox } from '@/lib/messagebox';
import { PropertyProxy, ProxyStatus } from '@/lib/binding/api';
import { callDeviceSlot, createRequestSceneHandler } from '@/lib/request';
import {
  getDbConn,
  getLogger,
  getProjectModel,
  getTopology,
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
    const result = await getDbConn().getDatabaseScene(uuid);
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
  sceneName?: string
): Promise<void> {
  if (!sceneName) sceneName = await resolveDefaultDeviceScene(deviceId);
  if (!sceneName) return;
  console.log(`Opening scene "${sceneName}" of device "${deviceId}" ...`);
  const result = await _retrieveDeviceScene(deviceId, sceneName);
  if (result) {
    // The retrieval was successful - result is a SceneModel
    result.reset_uuid();
    result.simple_name = `${deviceId}|${sceneName}`;
    openUnattachedSceneInWorkspace(result);
  }
}

function resolveDefaultDeviceScene(
  deviceId: string
): Promise<string | undefined> {
  const root = getTopology().getDevice(deviceId);
  if (root.status === ProxyStatus.OFFLINE) return Promise.resolve(undefined);
  const proxy = new PropertyProxy(root, 'availableScenes');
  return new Promise((resolve) => {
    let ready = false;
    const cleanups: (() => void)[] = [];
    const finish = (name?: string) => {
      cleanups.forEach((cleanup) => cleanup());
      proxy.dispose();
      resolve(name);
    };
    const check = () => {
      if (!ready) return;
      if (root.status === ProxyStatus.OFFLINE) {
        finish();
        return;
      }
      const scenes: unknown = proxy.value;
      if (Array.isArray(scenes)) {
        finish(typeof scenes[0] === 'string' ? scenes[0] : undefined);
      } else if (root.hasSchema() && !proxy.binding) {
        finish();
      }
    };
    cleanups.push(
      proxy.value_update(check),
      proxy.binding_update(check),
      // The topology owns root strongly; retain check and its temporary proxy
      // while waiting, since Signal holds its subscription owners weakly.
      root.status_update.subscribe(root, check)
    );
    proxy.startMonitoring();
    ready = true;
    check();
  });
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
    const capabilities = attrs.getValue<number>('capabilities');
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
    getLogger().info(
      `Requesting unattached scene "${sceneName}" from device "${deviceId}"`
    );
    const requestId = callDeviceSlot(
      createRequestSceneHandler(deviceId, sceneName, resolve),
      deviceId,
      'requestScene',
      { name: sceneName }
    );
    console.debug(
      `Token for request of scene "${sceneName}" of device "${deviceId}": ${requestId}`
    );
  });
}
