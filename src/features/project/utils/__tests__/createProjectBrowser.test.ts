import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { createProjectBrowser } from '../createProjectBrowser';

it('builds navigation for a loaded tree without mutating it', () => {
  const root = new ProjectModel({ uuid: 'root', simple_name: 'Experiment' });
  const motors = new ProjectModel({ uuid: 'motors', simple_name: 'Motors' });
  const camera = new ProjectModel({ uuid: 'camera', simple_name: 'Camera' });
  const lens = new ProjectModel({
    uuid: 'lens',
    simple_name: 'Lens',
    is_trashed: true,
  });
  root.subprojects = [motors, camera];
  camera.subprojects = [lens];
  for (const project of [root, motors, camera, lens]) {
    project.initialized = true;
    project.scenes = [];
    Object.freeze(project.scenes);
    Object.freeze(project.subprojects);
    Object.freeze(project);
  }

  const browser = createProjectBrowser(root);
  expect(browser.rootProjectUuid).toBe('root');
  expect(browser.projectsByUuid.size).toBe(4);
  const rows = ['root', 'motors', 'camera', 'lens'].map((uuid) => {
    const entry = browser.projectsByUuid.get(uuid)!;
    expect(entry.projectUuid).toBe(uuid);
    return [uuid, entry.projectName, entry.subprojectUuids, entry.isTrashed];
  });
  expect(rows).toEqual([
    ['root', 'Experiment', ['motors', 'camera'], false],
    ['motors', 'Motors', [], false],
    ['camera', 'Camera', ['lens'], false],
    ['lens', 'Lens', [], true],
  ]);
});

it('builds a root-only navigation for a loaded leaf', () => {
  const root = new ProjectModel({ uuid: 'root', simple_name: 'Empty' });
  root.initialized = true;
  root.scenes = [];
  const browser = createProjectBrowser(root);
  expect(browser.rootProjectUuid).toBe('root');
  expect([...browser.projectsByUuid.values()]).toStrictEqual([
    {
      projectUuid: 'root',
      projectName: 'Empty',
      subprojectUuids: [],
      isTrashed: false,
      isLoaded: true,
      scenes: [],
    },
  ]);
});

it('preserves both parent links and populated data regardless of visit order', () => {
  const root = new ProjectModel({ uuid: 'root' });
  const motors = new ProjectModel({ uuid: 'motors' });
  const camera = new ProjectModel({ uuid: 'camera' });
  const calibration = new ProjectModel({
    uuid: 'calibration',
    simple_name: 'Calibration',
    is_trashed: true,
  });
  calibration.initialized = true;
  calibration.subprojects = [
    new ProjectModel({ uuid: 'settings', simple_name: 'Settings' }),
  ];
  motors.subprojects = [new ProjectModel({ uuid: 'calibration' })];
  camera.subprojects = [calibration];
  root.subprojects = [motors, camera];

  const motorsFirst = createProjectBrowser(root);
  root.subprojects.reverse();
  const cameraFirst = createProjectBrowser(root);

  for (const browser of [cameraFirst, motorsFirst]) {
    const entries = browser.projectsByUuid;
    expect(entries.size).toBe(5);
    expect(entries.get('motors')?.subprojectUuids).toEqual(['calibration']);
    expect(entries.get('camera')?.subprojectUuids).toEqual(['calibration']);
    expect(entries.get('calibration')).toStrictEqual({
      projectUuid: 'calibration',
      projectName: 'Calibration',
      isTrashed: true,
      isLoaded: true,
      subprojectUuids: ['settings'],
      scenes: [],
    });
    expect(entries.get('settings')?.projectName).toBe('Settings');
  }
});

it('visits descendants of repeated initialized project instances', () => {
  const root = new ProjectModel({ uuid: 'root' });
  const first = new ProjectModel({ uuid: 'parent' });
  const second = new ProjectModel({ uuid: 'parent' });
  first.initialized = true;
  second.initialized = true;
  first.subprojects = [new ProjectModel({ uuid: 'child' })];
  const child = new ProjectModel({
    uuid: 'child',
    simple_name: 'Loaded child',
  });
  child.initialized = true;
  second.subprojects = [child];
  root.subprojects = [first, second];

  const browser = createProjectBrowser(root);
  expect(browser.projectsByUuid.get('child')?.projectName).toBe('Loaded child');
});

it('terminates cycles and keeps the populated root when its UUID reappears', () => {
  const root = new ProjectModel({ uuid: 'root', simple_name: 'Experiment' });
  root.initialized = true;
  const child = new ProjectModel({ uuid: 'child' });
  root.subprojects = [child];
  child.subprojects = [root, new ProjectModel({ uuid: 'root' })];

  const browser = createProjectBrowser(root);
  expect(browser.rootProjectUuid).toBe('root');
  expect(browser.projectsByUuid.size).toBe(2);
  expect(browser.projectsByUuid.get('root')).toStrictEqual({
    projectUuid: 'root',
    projectName: 'Experiment',
    isTrashed: false,
    isLoaded: true,
    subprojectUuids: ['child'],
    scenes: [],
  });
});

it('lists a repeated child UUID once per parent', () => {
  const root = new ProjectModel({ uuid: 'root' });
  const first = new ProjectModel({ uuid: 'shared', simple_name: 'Shared' });
  const second = new ProjectModel({ uuid: 'shared' });
  first.initialized = true;
  root.subprojects = [first, second];

  const browser = createProjectBrowser(root);
  expect(browser.projectsByUuid.get('root')?.subprojectUuids).toEqual([
    'shared',
  ]);
  expect(browser.projectsByUuid.size).toBe(2);
});

it('keeps every collected project reachable from the root', () => {
  const root = new ProjectModel({ uuid: 'root' });
  const loaded = new ProjectModel({ uuid: 'parent', simple_name: 'Parent' });
  const stub = new ProjectModel({ uuid: 'parent' });
  loaded.initialized = true;
  loaded.subprojects = [new ProjectModel({ uuid: 'seen' })];
  stub.subprojects = [new ProjectModel({ uuid: 'discovered' })];
  root.subprojects = [loaded, stub];

  const browser = createProjectBrowser(root);
  const reachable = new Set<string>();
  const walk = (uuid: string) => {
    if (reachable.has(uuid)) {
      return;
    }
    reachable.add(uuid);
    browser.projectsByUuid.get(uuid)?.subprojectUuids.forEach(walk);
  };
  walk(browser.rootProjectUuid);

  expect(browser.projectsByUuid.get('parent')?.subprojectUuids).toEqual([
    'seen',
    'discovered',
  ]);
  expect([...reachable].sort()).toEqual(
    [...browser.projectsByUuid.keys()].sort()
  );
});

it('reports whether each project has been loaded', () => {
  const root = new ProjectModel({ uuid: 'root', simple_name: 'Experiment' });
  root.initialized = true;
  root.subprojects = [new ProjectModel({ uuid: 'pending' })];

  const browser = createProjectBrowser(root);
  expect(browser.projectsByUuid.get('root')?.isLoaded).toBe(true);
  const pending = browser.projectsByUuid.get('pending');
  expect(pending?.isLoaded).toBe(false);
  expect(pending?.projectName).toBe('');
});

it('lists the scenes of a loaded project in order', () => {
  const root = new ProjectModel({ uuid: 'root', simple_name: 'Experiment' });
  root.initialized = true;
  root.scenes = [
    new SceneModel({ uuid: 'overview', simple_name: 'Overview' }),
    new SceneModel({ uuid: 'alignment', simple_name: 'Alignment' }),
  ];

  const browser = createProjectBrowser(root);
  expect(browser.projectsByUuid.get('root')?.scenes).toEqual([
    { sceneUuid: 'overview', sceneName: 'Overview' },
    { sceneUuid: 'alignment', sceneName: 'Alignment' },
  ]);
});

it('reports no scenes for a project that has not been loaded', () => {
  const root = new ProjectModel({ uuid: 'root' });
  root.initialized = true;
  root.subprojects = [new ProjectModel({ uuid: 'pending' })];

  const browser = createProjectBrowser(root);
  const pending = browser.projectsByUuid.get('pending');
  expect(pending?.isLoaded).toBe(false);
  expect(pending?.scenes).toEqual([]);
});

it('takes scenes from the loaded copy when a UUID is repeated', () => {
  const root = new ProjectModel({ uuid: 'root' });
  const stub = new ProjectModel({ uuid: 'shared' });
  const loaded = new ProjectModel({ uuid: 'shared', simple_name: 'Shared' });
  loaded.initialized = true;
  loaded.scenes = [new SceneModel({ uuid: 'scene-a', simple_name: 'Scene A' })];
  root.subprojects = [stub, loaded];

  const browser = createProjectBrowser(root);
  expect(browser.projectsByUuid.get('shared')).toStrictEqual({
    projectUuid: 'shared',
    projectName: 'Shared',
    isTrashed: false,
    isLoaded: true,
    subprojectUuids: [],
    scenes: [{ sceneUuid: 'scene-a', sceneName: 'Scene A' }],
  });
});
