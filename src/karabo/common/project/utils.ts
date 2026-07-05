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

export function isProjectInitialized(project: ProjectModel): boolean {
  return (
    project.initialized &&
    Array.isArray(project.scenes) &&
    project.scenes.every(
      (scene) => scene instanceof SceneModel && scene.initialized
    )
  );
}
