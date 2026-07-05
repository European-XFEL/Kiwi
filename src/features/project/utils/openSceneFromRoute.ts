import {
  isProjectInitialized,
  ProjectModel,
} from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Hash, HashList } from '@/karabo/data/api';
import type { SceneURLParams } from '@/features/navigation/utils';
import { KaraboEvent } from '@/lib/events';
import { showMessageBox } from '@/lib/messagebox';
import { getDbConn, getMediator, getProjectModel } from '@/lib/singletons/api';
import { openSceneInWorkspace } from './openSceneInWorkspace';

const cancelledMessage = 'Scene loading was cancelled.';

export interface SceneRouteLoadHandle {
  controller: AbortController;
  promise: Promise<void>;
  abort: () => void;
}

function waitForEvent(
  event: KaraboEvent,
  signal: AbortSignal,
  accepts: (hash: Hash) => boolean = () => true
): Promise<Hash> {
  if (signal.aborted) {
    return Promise.reject(new Error(cancelledMessage));
  }

  return new Promise((resolve, reject) => {
    let unsubscribe: () => void = () => undefined;

    const cleanup = () => {
      unsubscribe();
      signal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new Error(cancelledMessage));
    };

    unsubscribe = getMediator().on(event, (hash) => {
      if (!accepts(hash)) {
        return;
      }

      cleanup();
      resolve(hash);
    });

    signal.addEventListener('abort', onAbort, { once: true });
  });
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

      const projectModel = getProjectModel();
      let project =
        projectModel.domain === params.domain &&
        projectModel.root?.uuid === params.projectUuid
          ? projectModel.root
          : undefined;

      if (!project) {
        const projectsPromise = waitForEvent(KaraboEvent.ListProjects, signal);
        getDbConn().listProjects(params.domain);

        const hash = await projectsPromise;
        const reason = hash.getValue<string>('reason');
        if (reason.length > 0) {
          throw new Error(reason);
        }

        project = hash
          .getValue<HashList>('reply.items')
          .map(
            (item) =>
              new ProjectModel({
                uuid: item.getValue('uuid'),
                date: item.getValue('date'),
                simple_name: item.getValue('simple_name'),
                is_trashed: item.getValue('is_trashed'),
              })
          )
          .filter((item) => !item.is_trashed)
          .find((item) => item.uuid === params.projectUuid);

        if (!project) {
          throw new Error(
            `Project "${params.projectUuid}" was not found in ${params.domain}.`
          );
        }
      }

      if (!isProjectInitialized(project)) {
        const projectLoaded = waitForEvent(
          KaraboEvent.DatabaseBusy,
          signal,
          (hash) => hash.has('is_processing') && !hash.getValue('is_processing')
        );
        getDbConn().loadProject(params.domain, project);

        const hash = await projectLoaded;
        const loadingFailed = hash.has('loading_failed')
          ? hash.getValue<boolean>('loading_failed')
          : false;
        if (loadingFailed) {
          throw new Error(`Could not load project "${project.simple_name}".`);
        }
      }

      projectModel.setRoot(params.domain, project);

      const scene = project.scenes?.find(
        (item): item is SceneModel =>
          item instanceof SceneModel && item.uuid === params.sceneUuid
      );
      if (!scene) {
        throw new Error(
          `Scene "${params.sceneUuid}" was not found in project "${project.simple_name}".`
        );
      }

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
