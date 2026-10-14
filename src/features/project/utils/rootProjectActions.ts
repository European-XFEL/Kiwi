import { findSceneModelInProject } from '@/karabo/common/project/api';
import { showMessageBox } from '@/lib/messagebox';
import { getProjectModel } from '@/lib/singletons/api';
import { useGlobalStore } from '@/store/api';
import type {
  ProjectSceneSelection,
  RootProjectLoadHandle,
} from '../types/project.types';
import { loadProject } from './loadProject';
import { openSceneInWorkspace } from './openSceneInWorkspace';

export function loadRootProject(selection: {
  domain: string;
  projectUuid: string;
}): RootProjectLoadHandle {
  return startRootProjectLoad(selection);
}

export function loadRootProjectScene(
  selection: ProjectSceneSelection
): RootProjectLoadHandle {
  return startRootProjectLoad(selection);
}

export function clearRootProject(): void {
  getProjectModel().clearRoot();
}

function startRootProjectLoad({
  domain,
  projectUuid,
  sceneUuid,
}: {
  domain: string;
  projectUuid: string;
  sceneUuid?: string;
}): RootProjectLoadHandle {
  const controller = new AbortController();
  const { signal } = controller;
  // This also cancels a pending project-list request, before DatabaseBusy begins.
  const unsubscribe = useGlobalStore.subscribe((state, previous) => {
    if (previous.sessionInfo && !state.sessionInfo) {
      controller.abort();
    }
  });

  const promise = (async () => {
    try {
      if (!projectUuid) {
        throw new Error('A project UUID is required to open a scene.');
      }
      const project = await loadProject(domain, projectUuid, signal);
      const scene =
        sceneUuid === undefined
          ? undefined
          : findSceneModelInProject(project, sceneUuid);
      if (sceneUuid !== undefined && !scene) {
        throw new Error(
          `Scene "${sceneUuid}" was not found in project "${project.simple_name}".`
        );
      }
      // Attach only the completed graph, including a final cancellation check
      // after the database reply has resolved the load.
      if (signal.aborted) {
        throw new Error('Scene loading was cancelled.');
      }
      getProjectModel().setRoot(domain, project);
      if (scene) {
        openSceneInWorkspace({ model: scene });
      }
    } catch (error) {
      if (!signal.aborted) {
        showMessageBox({
          variant: 'error',
          title:
            sceneUuid === undefined
              ? 'Could not open project'
              : 'Could not open scene',
          msg:
            error instanceof Error
              ? error.message
              : 'The project could not be loaded.',
        });
      }
      throw error;
    } finally {
      unsubscribe();
    }
  })();

  return { controller, promise, abort: () => controller.abort() };
}
