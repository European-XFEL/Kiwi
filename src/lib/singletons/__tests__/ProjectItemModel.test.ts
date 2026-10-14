import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { ProjectItemModel } from '../ProjectItemModel';
import { KaraboEvent } from '@/lib/events';
import { Mediator } from '../Mediator';
import { SingletonContext } from '@/testing';

function project(uuid: string, children: ProjectModel[] = []) {
  const model = new ProjectModel({ uuid, simple_name: uuid });
  model.initialized = true;
  model.subprojects = children;
  return model;
}

it('publishes stable snapshots synchronously after nodes and indexes are complete', () => {
  const model = new ProjectItemModel();
  const empty = model.getSnapshot();
  expect(model.getSnapshot()).toBe(empty);
  const root = project('root');
  const scene = new SceneModel({ uuid: 'scene', initialized: true });
  root.scenes = [scene];
  const listener = jest.fn(() => {
    expect(model.getSnapshot().root).toBe(root);
    expect(model.getProject('root')).toBe(root);
    expect(model.getScene('scene')).toBe(scene);
    expect(model.getSceneProject('scene')).toBe(root);
  });
  const unsubscribe = model.subscribe(listener);
  model.setRoot('CONTROLS', root);
  expect(listener).toHaveBeenCalledTimes(1);
  const snapshot = model.getSnapshot();
  expect(snapshot).not.toBe(empty);
  expect(model.getSnapshot()).toBe(snapshot);
  const rootNode = snapshot.nodes[0];
  expect(rootNode?.children?.map((node) => node.kind)).toEqual([
    'scenes',
    'subprojects',
  ]);
  const sceneNode = rootNode?.children?.[0].children?.[0];
  expect(sceneNode?.children).toBeNull();
  expect(sceneNode?.parent).toBe(rootNode?.children?.[0]);
  expect(model.getNode(sceneNode!.id)).toBe(sceneNode);
  root.simple_name = 'Renamed';
  root.subprojects = [project('child')];
  model.setRoot('CONTROLS', root);
  expect(listener).toHaveBeenCalledTimes(2);
  expect(model.getSnapshot()).not.toBe(snapshot);
  expect(model.getSnapshot().nodes[0]).toBe(rootNode);
  expect(model.getNode(sceneNode!.id)).toBe(sceneNode);
  expect(rootNode?.name).toBe('Renamed');
  expect(model.getProject('child')).toBe(root.subprojects[0]);
  expect([...snapshot.projects.keys()]).toEqual(['root']);
  unsubscribe();
  model.clearRoot();
  expect(listener).toHaveBeenCalledTimes(2);
  expect(model.getSnapshot()).toEqual({
    root: undefined,
    domain: undefined,
    nodes: [],
    projects: new Map(),
  });
  expect(model.getNode(rootNode!.id)).toBeUndefined();
  expect(model.getProject('child')).toBeUndefined();
  expect(model.getScene('scene')).toBeUndefined();
  expect(model.getSceneProject('scene')).toBeUndefined();
});

it('keeps shared parent links, prefers loaded copies, unions descendants and stops ancestor cycles', () => {
  const model = new ProjectItemModel();
  const stub = new ProjectModel({ uuid: 'shared' });
  stub.subprojects = [project('stub-child')];
  const shared = project('shared', [project('loaded-child')]);
  const scene = new SceneModel({ uuid: 'shared-scene', initialized: true });
  shared.scenes = [scene];
  const left = project('left', [stub]);
  const right = project('right', [shared]);
  const root = project('root', [left, right]);
  shared.subprojects.push(root);
  model.setRoot('CONTROLS', root);
  const rootNode = model.getSnapshot().nodes[0];
  const parents = rootNode.children![1].children!;
  const first = parents[0].children![1].children![0];
  const second = parents[1].children![1].children![0];
  expect(first.id).not.toBe(second.id);
  expect(first.model).toBe(shared);
  expect(second.model).toBe(shared);
  expect(first.parent).toBe(parents[0].children![1]);
  expect(second.parent).toBe(parents[1].children![1]);
  expect(first.children![1].children!.map((node) => node.name)).toEqual([
    'stub-child',
    'loaded-child',
  ]);
  expect(model.getProject('shared')).toBe(shared);
  expect(model.getSceneProject('shared-scene')).toBe(shared);
});

it('publishes every clear and removes stale indexes after same-root updates', () => {
  const model = new ProjectItemModel();
  const root = project('root', [project('removed')]);
  model.setRoot('CONTROLS', root);
  root.subprojects = [];
  model.setRoot('CONTROLS', root);
  expect(model.getProject('removed')).toBeUndefined();
  const listener = jest.fn();
  const off = model.subscribe(listener);
  model.clearRoot();
  const snapshot = model.getSnapshot();
  model.clearRoot();
  expect(model.getSnapshot()).not.toBe(snapshot);
  expect(listener).toHaveBeenCalledTimes(2);
  off();
});

it('announces attachment, same-root updates and clearing after synchronizing the snapshot and indexes', async () => {
  const mediator = new Mediator();
  await SingletonContext.run({ mediator }, () => {
    const model = new ProjectItemModel();
    const root = project('root');
    const scene = new SceneModel({ uuid: 'scene', initialized: true });
    root.scenes = [scene];
    const announcements: string[] = [];
    const off = mediator.on(KaraboEvent.RootProjectChanged, () => {
      const snapshot = model.getSnapshot();
      if (snapshot.root) {
        expect(model.getProject('root')).toBe(root);
        expect(model.getScene('scene')).toBe(scene);
        expect(model.getSceneProject('scene')).toBe(root);
        expect(model.getNode(snapshot.nodes[0].id)).toBe(snapshot.nodes[0]);
        announcements.push(snapshot.nodes[0].name);
      } else {
        expect(snapshot).toEqual({
          root: undefined,
          domain: undefined,
          nodes: [],
          projects: new Map(),
        });
        expect(model.getProject('root')).toBeUndefined();
        expect(model.getScene('scene')).toBeUndefined();
        announcements.push('cleared');
      }
    });
    try {
      model.setRoot('CONTROLS', root);
      expect(announcements).toEqual(['root']);
      root.simple_name = 'Renamed';
      model.setRoot('CONTROLS', root);
      model.clearRoot();
      expect(announcements).toEqual(['root', 'Renamed', 'cleared']);
    } finally {
      off();
    }
  });
});
