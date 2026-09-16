import {
  findSceneModelInProject,
  type ProjectModel,
} from '@/karabo/common/project/api';
import type { SceneModel } from '@/karabo/common/scenemodel/api';
import { showMessageBox } from '@/lib/messagebox';
import { getProjectModel } from '@/lib/singletons/api';
import type {
  ProjectSceneSelection,
  RootProjectLoadHandle,
} from '../types/project.types';
import { loadProject } from './loadProject';
import { openSceneInWorkspace } from './openSceneInWorkspace';

export function loadRootProjectFromDialogSelection(
  domain: string,
  project: ProjectModel,
  scene: SceneModel
): RootProjectLoadHandle {
  return startRootProjectLoad({
    domain,
    projectUuid: project.uuid,
    sceneUuid: scene.uuid,
  });
}

export function loadRootProjectFromBookmark({
  domain,
  projectUuid,
  sceneUuid,
}: ProjectSceneSelection): RootProjectLoadHandle {
  return startRootProjectLoad({ domain, projectUuid, sceneUuid });
}

export function clearRootProject(): void {
  getProjectModel().clearRoot();
}

function startRootProjectLoad({
  domain,
  projectUuid,
  sceneUuid,
}: ProjectSceneSelection): RootProjectLoadHandle {
  const controller = new AbortController();
  const { signal } = controller;

  const promise = (async () => {
    try {
      if (!projectUuid) {
        throw new Error('A project UUID is required to open a scene.');
      }

      const project = await loadProject(domain, projectUuid, signal);
      const scene = findSceneModelInProject(project, sceneUuid);
      if (!scene) {
        throw new Error(
          `Scene "${sceneUuid}" was not found in project "${project.simple_name}".`
        );
      }

      // Cancellation can arrive after the database reply resolves the load.
      // Keep activation and scene opening together after this final check.
      if (signal.aborted) {
        throw new Error('Scene loading was cancelled.');
      }

      getProjectModel().setRoot(domain, project); // Emits RootProjectChanged.
      openSceneInWorkspace({ model: scene }); // Emits OpenScene.
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

  return { controller, promise, abort: () => controller.abort() };
}
