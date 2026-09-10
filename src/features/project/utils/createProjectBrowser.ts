import { ProjectModel } from '@/karabo/common/project/api';

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

// A project as collected so far: the model that currently represents its
// UUID, plus the deduplicated child UUIDs seen for it across every instance
// that has been visited under that UUID.
interface CollectedProject {
  model: ProjectModel;
  subprojectUuids: string[];
  seenSubprojectUuids: Set<string>;
}

// Each parent keeps its child UUIDs. When instances share a UUID, prefer an
// initialized copy; still visit every instance to discover populated descendants.
// Their child UUIDs are unioned onto the shared entry, so a project discovered
// under a losing instance stays reachable from the root, and deduplicated, so a
// UUID appears at most once per parent. Among several initialized copies the
// first visited wins: the database yields a single loaded copy per UUID. Scenes
// come from that winning copy; a losing stub is uninitialized and so has none
// to contribute.
export function createProjectBrowser(root: ProjectModel): ProjectBrowserModel {
  const collected = collectProjects(root);

  return {
    rootProjectUuid: root.uuid,
    projectsByUuid: new Map(
      [...collected].map(
        ([uuid, collectedProject]): [string, ProjectBrowserEntry] => [
          uuid,
          toBrowserEntry(uuid, collectedProject),
        ]
      )
    ),
  };
}

// Walk the project graph depth first from the root, collecting one entry per
// UUID. Subprojects may be shared between parents or loop back to an ancestor,
// so each node is walked at most once.
function collectProjects(root: ProjectModel): Map<string, CollectedProject> {
  const collected = new Map<string, CollectedProject>();
  const visited = new Set<ProjectModel>();

  const visit = (project: ProjectModel): void => {
    if (visited.has(project)) {
      return; // already walked this exact node: a cycle would recurse forever otherwise.
    }
    visited.add(project);

    const collectedProject = getOrCreateCollectedProject(collected, project);
    recordChildren(collectedProject, project);

    for (const child of project.subprojects) {
      visit(child);
    }
  };

  visit(root);

  return collected;
}

// Find this UUID's entry, creating one on first sight. On a repeat sight,
// promote it to the newly visited instance only if that instance is loaded
// and the current entry is not: the first initialized copy wins.
function getOrCreateCollectedProject(
  collected: Map<string, CollectedProject>,
  project: ProjectModel
): CollectedProject {
  const existing = collected.get(project.uuid);
  if (!existing) {
    const created: CollectedProject = {
      model: project,
      subprojectUuids: [],
      seenSubprojectUuids: new Set<string>(),
    };
    collected.set(project.uuid, created);
    return created;
  }

  if (!existing.model.initialized && project.initialized) {
    existing.model = project;
  }

  return existing;
}

// Add this instance's children to the entry, skipping any child UUID
// already recorded for it under a different instance.
function recordChildren(
  collectedProject: CollectedProject,
  project: ProjectModel
): void {
  for (const child of project.subprojects) {
    if (!collectedProject.seenSubprojectUuids.has(child.uuid)) {
      collectedProject.seenSubprojectUuids.add(child.uuid);
      collectedProject.subprojectUuids.push(child.uuid);
    }
  }
}

// Flatten one collected project into the read-only entry the browser renders.
function toBrowserEntry(
  uuid: string,
  { model, subprojectUuids }: CollectedProject
): ProjectBrowserEntry {
  return {
    projectUuid: uuid,
    projectName: model.simple_name,
    isTrashed: model.is_trashed,
    isLoaded: model.initialized,
    subprojectUuids,
    scenes: (model.scenes ?? []).map((scene) => ({
      sceneUuid: scene.uuid,
      sceneName: scene.simple_name,
    })),
  };
}
