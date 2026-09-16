import { ProjectModel } from '../model';
import { SceneModel } from '../../scenemodel/api';
import { findSceneModelInProject, walkProjectModels } from '../utils';

it('walks shared and cyclic project references once in depth-first order', () => {
  const root = new ProjectModel({ uuid: 'root' });
  const left = new ProjectModel({ uuid: 'left' });
  const right = new ProjectModel({ uuid: 'right' });
  const shared = new ProjectModel({ uuid: 'shared' });
  root.subprojects = [left, right];
  left.subprojects = [shared, root];
  right.subprojects = [shared];

  expect([...walkProjectModels(root)]).toEqual([root, left, shared, right]);
  expect(findSceneModelInProject(root, 'missing')).toBeUndefined();
});

it('visits distinct instances of the same project UUID to find loaded scenes', () => {
  const root = new ProjectModel({ uuid: 'root' });
  const stub = new ProjectModel({ uuid: 'child' });
  const loaded = new ProjectModel({ uuid: 'child' });
  const scene = new SceneModel({ uuid: 'scene' });
  loaded.scenes = [scene];
  root.subprojects = [stub, loaded];

  expect([...walkProjectModels(root)]).toEqual([root, stub, loaded]);
  expect(findSceneModelInProject(root, 'scene')).toBe(scene);
});
