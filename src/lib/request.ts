import { Hash } from '@/karabo/data/api';
import type { LoadProjectSceneResult } from '@/karabo/common/project/api';
import type { SceneModel } from '@/karabo/common/scenemodel/api';
import {
  getDbConn,
  getManager,
  getTopology,
  RequestHandler,
} from './singletons/api';

function waitForTopology(isCancelled: () => boolean): Promise<boolean> {
  if (getTopology().initialized) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const poll = setInterval(() => {
      if (isCancelled()) {
        clearInterval(poll);
        resolve(false);
        return;
      }

      if (getTopology().initialized) {
        clearInterval(poll);
        resolve(true);
      }
    }, 100);
  });
}

export async function fetchSceneContent(
  domain: string,
  projectName: string,
  uuid: string
): Promise<SceneModel> {
  const result = await new Promise<LoadProjectSceneResult>((resolve) =>
    getDbConn().getScene(domain, projectName, uuid, resolve)
  );

  if (result.error_msg) {
    throw new Error(result.error_msg);
  }

  if (!result.sceneModel) {
    throw new Error('The scene could not be loaded.');
  }

  const ready = await waitForTopology(() => false);
  if (!ready) {
    throw new Error('The scene could not be loaded.');
  }

  return result.sceneModel;
}

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
