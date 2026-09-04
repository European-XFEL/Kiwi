import type { SceneURLParams } from '@/features/navigation/utils';
import { showMessageBox } from '@/lib/messagebox';
import { openSceneInWorkspace } from './openSceneInWorkspace';
import { loadProjectSceneModel } from './loadProjectSceneModel';

const cancelledMessage = 'Scene loading was cancelled.';

export interface SceneRouteLoadHandle {
  controller: AbortController;
  promise: Promise<void>;
  abort: () => void;
}

export function startSceneFromRoute(
  params: SceneURLParams
): SceneRouteLoadHandle {
  const controller = new AbortController();
  const { signal } = controller;

  const promise = (async () => {
    try {
      if (signal.aborted) {
        throw new Error(cancelledMessage);
      }

      if (!params.projectUuid) {
        throw new Error('Scene route is missing the project UUID.');
      }

      const scene = await loadProjectSceneModel({
        domain: params.domain,
        projectUuid: params.projectUuid,
        sceneUuid: params.sceneUuid,
        signal,
      });
      openSceneInWorkspace({ model: scene });
    } catch (error) {
      if (!signal.aborted) {
        showMessageBox({
          variant: 'error',
          title: 'Could not open scene',
          msg:
            error instanceof Error
              ? error.message
              : 'The scene could not be loaded.',
        });
      }
      throw error;
    }
  })();

  return {
    controller,
    promise,
    abort: () => controller.abort(),
  };
}
