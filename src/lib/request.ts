import { Hash } from '@/karabo/data/api';
import { getManager, RequestHandler } from './singletons/api';
import { readScene, type SceneModel } from '@/karabo/common/api';
import { showMessageBox } from '@/lib/messagebox';

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
 * Create a request handler for scene-loading replies from the GUI server.
 *
 * The returned handler reads scene XML from `payload.data`, converts it into a
 * `SceneModel`, and resolves the provided callback with that model. If the
 * request fails or the reply has no scene payload, it shows an error message
 * and resolves to `undefined`.
 */
export function createRequestSceneHandler(
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
