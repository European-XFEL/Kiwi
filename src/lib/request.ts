import { Capabilities } from '@/karabo/data/api';
import { Hash } from '@/karabo/data/api';
import { getManager, getTopology, RequestHandler } from './singletons/api';
import { readScene, SceneModel } from '@/karabo/common/api';

export function callDeviceSlot(
  handler: RequestHandler,
  instanceId: string,
  slotName: string,
  kwargs: Record<string, any> = {}
): string {
  /**
   * Call a device slot via the GUI server. This works with slots which
   * take a single `Hash` as an argument and reply with a `Hash`.
   *
   * handler signatures:
   *   - handler(success, reply)
   *   - handler(success, reply, request)
   *
   * Returns:
   *   token: A unique identifier for the call
   */
  // Prepare the parameters Hash
  const params = new Hash();
  for (const [key, value] of Object.entries(kwargs)) {
    params.set(key, value);
  }

  // Call the slot and return the token
  return getManager().callDeviceSlot(handler, instanceId, slotName, params);
}

/**
 * Retrieves a device provided scene.
 *
 * @param deviceId identifier of the device whose scene should be retrieved
 * @param sceneName name of the device scene to be retrieved
 * @returns contents and metadata of the requested Device Scene for the successful
 * case or an string with an error message in case of failure
 */
export async function retrieveDeviceScene(
  deviceId: string,
  sceneName: string
): Promise<SceneModel | string> {
  const attrs = getTopology().getDeviceInstanceInfo(deviceId);
  if (attrs === undefined) {
    const errMsg = `Device "${deviceId}" not online. Cannot retrieve its "${sceneName}" scene.`;
    console.error(errMsg);
    return errMsg;
  }
  const capabilities = attrs.get('capabilities').value_ as number;
  if (
    capabilities === undefined ||
    (capabilities & Capabilities.PROVIDES_SCENES) !== 1
  ) {
    const errMsg = `Device "${deviceId}" does not provide a scene`;
    console.error(errMsg);
    return errMsg;
  }
  /* Wraps a callDeviceSlot to request a device scene in a Promise that will
   be fullfilled by the handler passed to callDeviceSlot, adapting
   callDeviceSlot to async function callers */
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

/* callDeviceSlot resolver for a requestScene slot call */
function _createRequestSceneHandler(
  deviceId: string,
  sceneName: string,
  resolve: (scene: SceneModel | string) => void
): RequestHandler {
  return (success: boolean, reply: Hash): void => {
    if (!success) {
      const errMsg = `Request for scene "${sceneName}" of device "${deviceId}" failed: "${reply.value_}"`;
      console.error(errMsg);
      resolve(errMsg);
      return;
    }

    const payload = reply.getValue('payload.data') as string | undefined;
    if (!payload) {
      const errMsg = `Reply to request for scene "${sceneName} of device "${deviceId}" had no scene data (empty 'payload.data')`;
      console.error(errMsg);

      resolve(errMsg);
      return;
    }
    const sceneModel = readScene(payload);
    sceneModel.reset_uuid();
    sceneModel.simple_name = `${deviceId}|${sceneName}`;
    resolve(sceneModel);
  };
}
