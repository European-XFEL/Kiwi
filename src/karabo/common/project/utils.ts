import { ProjectModel } from './model';
import { BaseProjectObjectModel } from './bases';
import { SceneModel } from '../scenemodel/api';
import { PROJECT_DB_TYPE_PROJECT, PROJECT_DB_TYPE_SCENE } from './const';

export function get_item_type(obj: BaseProjectObjectModel): string {
  if (obj instanceof ProjectModel) {
    return PROJECT_DB_TYPE_PROJECT;
  }
  if (obj instanceof SceneModel) {
    return PROJECT_DB_TYPE_SCENE;
  }
  throw new Error(`Unknown object type: ${obj.constructor.name}`);
}

export function* walkProjectModels(
  project: ProjectModel
): Generator<ProjectModel> {
  const visited = new Set<ProjectModel>();

  function* visit(model: ProjectModel): Generator<ProjectModel> {
    if (visited.has(model)) return;
    visited.add(model);
    yield model;

    for (const subproject of model.subprojects ?? []) {
      yield* visit(subproject);
    }
  }

  yield* visit(project);
}

export function findProjectModelInProject(
  project: ProjectModel,
  uuid: string
): ProjectModel | undefined {
  return Array.from(walkProjectModels(project)).find(
    (projectModel) => projectModel.uuid === uuid
  );
}

export function findSceneModelInProject(
  project: ProjectModel,
  uuid: string
): SceneModel | undefined {
  for (const projectModel of walkProjectModels(project)) {
    const scene = projectModel.scenes?.find(
      (scene): scene is SceneModel =>
        scene instanceof SceneModel && scene.uuid === uuid
    );
    if (scene) {
      return scene;
    }
  }
}
