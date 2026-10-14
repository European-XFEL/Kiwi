import type { ProjectSnapshot } from '@/lib/singletons/ProjectItemModel';

export interface ProjectBrowserSceneEntry {
  readonly sceneUuid: string;
  readonly sceneName: string;
}

export interface ProjectBrowserEntry {
  readonly projectUuid: string;
  readonly projectName: string;
  readonly isTrashed: boolean;
  readonly isLoaded: boolean;
  readonly subprojectUuids: readonly string[];
  readonly scenes: readonly ProjectBrowserSceneEntry[];
}

export interface ProjectBrowserModel {
  readonly rootProjectUuid: string;
  readonly projectsByUuid: ReadonlyMap<string, ProjectBrowserEntry>;
}

// The singleton already normalized shared UUIDs and child links for the tree.
export function createProjectBrowser({
  root,
  projects,
}: ProjectSnapshot): ProjectBrowserModel | undefined {
  if (!root) {
    return;
  }
  return {
    rootProjectUuid: root.uuid,
    projectsByUuid: new Map(
      Array.from(projects, ([uuid, { model, subprojectUuids }]) => [
        uuid,
        {
          projectUuid: uuid,
          projectName: model.simple_name,
          isTrashed: model.is_trashed,
          isLoaded: model.initialized,
          subprojectUuids: [...subprojectUuids],
          scenes: (model.scenes ?? []).map((scene) => ({
            sceneUuid: scene.uuid,
            sceneName: scene.simple_name,
          })),
        },
      ])
    ),
  };
}
