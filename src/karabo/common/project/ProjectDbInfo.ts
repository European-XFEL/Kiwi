import type { SceneModel } from '../scenemodel/SceneModel';
import { BaseProjectObjectModel } from './bases';

// #region Results for List operations for project entities

export interface LoadProjectItemsResult {
  projectItems: BaseProjectObjectModel[];
  error_msg?: string; // undefined if no error
}

export interface LoadProjectSceneResult {
  sceneModel?: SceneModel; // built by connector, never cached
  error_msg?: string; // undefined if no error
}

export interface ListProjectScenesResult {
  domain: string;
  projectName: string;
  scenes: SceneModel[];
  error_msg?: string; // undefined if no error
}

export const asLocalDateTimeString = (utcDateTimeString: string): string => {
  const dateTime = utcDateTimeString.endsWith('Z')
    ? new Date(utcDateTimeString)
    : new Date(utcDateTimeString + 'Z');

  const year = dateTime.getFullYear();
  const month = String(dateTime.getMonth() + 1).padStart(2, '0');
  const day = String(dateTime.getDate()).padStart(2, '0');
  const hour = String(dateTime.getHours()).padStart(2, '0');
  const minute = String(dateTime.getMinutes()).padStart(2, '0');
  const second = String(dateTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};
// #endregion
