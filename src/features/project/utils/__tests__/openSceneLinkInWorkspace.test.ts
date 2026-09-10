import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Capabilities, Hash } from '@/karabo/data/api';
import { showMessageBox } from '@/lib/messagebox';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';
import { getProjectModel } from '@/lib/singletons/api';
import {
  openDeviceSceneLinkInWorkspace,
  openSceneLinkInWorkspace,
  sceneUuidFromLinkTarget,
} from '../openSceneLinkInWorkspace';
import {
  openUnattachedSceneInWorkspace,
  openSceneInWorkspace,
} from '../openSceneInWorkspace';

jest.mock('../openSceneInWorkspace', () => ({
  openUnattachedSceneInWorkspace: jest.fn(),
  openSceneInWorkspace: jest.fn(),
}));

jest.mock('@/lib/messagebox', () => ({
  showMessageBox: jest.fn(),
}));

const mockCallDeviceSlot = jest.fn();
const mockGetDeviceInstanceInfo = jest.fn();
const mockGetDatabaseScene = jest.fn();
const mockProjectModel = new ProjectItemModel();
const mockMediator = { postEvent: jest.fn() };

jest.mock('@/lib/request', () => {
  const actual =
    jest.requireActual<typeof import('@/lib/request')>('@/lib/request');

  return {
    ...actual,
    callDeviceSlot: (
      ...args: Parameters<typeof mockCallDeviceSlot>
    ): ReturnType<typeof mockCallDeviceSlot> => mockCallDeviceSlot(...args),
  };
});

jest.mock('@/lib/singletons/api', () => ({
  getProjectModel: () => mockProjectModel,
  getMediator: () => mockMediator,
  getTopology: () => ({
    getDeviceInstanceInfo: mockGetDeviceInstanceInfo,
  }),
  getDbConn: () => ({
    getDatabaseScene: mockGetDatabaseScene,
  }),
}));

describe('openSceneLinkInWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProjectModel().clearRoot();
  });

  it('extracts a uuid from scene link targets', () => {
    expect(sceneUuidFromLinkTarget('Project:scene-1')).toBe('scene-1');
    expect(sceneUuidFromLinkTarget('scene-2')).toBe('scene-2');
  });

  it('opens the matching SceneModel from the current project root', async () => {
    const sceneA = new SceneModel({ uuid: 'scene-a', simple_name: 'Scene A' });
    const sceneB = new SceneModel({ uuid: 'scene-b', simple_name: 'Scene B' });
    const project = new ProjectModel({
      uuid: 'project-1',
      simple_name: 'ProjectA',
    });
    project.scenes = [sceneA, sceneB];
    getProjectModel().setRoot('CONTROLS', project);

    await openSceneLinkInWorkspace('ProjectA:scene-b');

    expect(openSceneInWorkspace).toHaveBeenCalledWith({ model: sceneB });
    expect(mockGetDatabaseScene).not.toHaveBeenCalled();
  });

  it('opens the matching SceneModel from a current project subproject', async () => {
    const scene = new SceneModel({
      uuid: 'subproject-scene',
      simple_name: 'Subproject Scene',
    });
    const subproject = new ProjectModel({
      uuid: 'subproject-1',
      simple_name: 'Subproject',
    });
    subproject.scenes = [scene];

    const project = new ProjectModel({
      uuid: 'project-1',
      simple_name: 'ProjectA',
    });
    project.scenes = [];
    project.subprojects = [subproject];
    getProjectModel().setRoot('CONTROLS', project);

    await openSceneLinkInWorkspace('Subproject:subproject-scene');

    expect(openSceneInWorkspace).toHaveBeenCalledWith({ model: scene });
    expect(mockGetDatabaseScene).not.toHaveBeenCalled();
  });

  it('opens the matching SceneModel from a nested subproject', async () => {
    const scene = new SceneModel({
      uuid: 'nested-scene',
      simple_name: 'Nested Scene',
    });
    const nestedSubproject = new ProjectModel({
      uuid: 'subproject-2',
      simple_name: 'Nested Subproject',
    });
    nestedSubproject.scenes = [scene];

    const subproject = new ProjectModel({
      uuid: 'subproject-1',
      simple_name: 'Subproject',
    });
    subproject.subprojects = [nestedSubproject];

    const project = new ProjectModel({
      uuid: 'project-1',
      simple_name: 'ProjectA',
    });
    project.scenes = [];
    project.subprojects = [subproject];
    getProjectModel().setRoot('CONTROLS', project);

    await openSceneLinkInWorkspace('NestedSubproject:nested-scene');

    expect(openSceneInWorkspace).toHaveBeenCalledWith({ model: scene });
    expect(mockGetDatabaseScene).not.toHaveBeenCalled();
  });

  it('requests the scene from the database when it is not in the current project', async () => {
    const project = new ProjectModel({
      uuid: 'project-1',
      simple_name: 'ProjectA',
    });
    project.scenes = [];
    getProjectModel().setRoot('CONTROLS', project);
    mockGetDatabaseScene.mockResolvedValue(undefined);

    await openSceneLinkInWorkspace('scene-b');

    expect(openSceneInWorkspace).not.toHaveBeenCalled();
    expect(openUnattachedSceneInWorkspace).not.toHaveBeenCalled();
    expect(mockGetDatabaseScene).toHaveBeenCalledWith('scene-b');
  });

  it('opens an unattached scene retrieved from the database', async () => {
    const project = new ProjectModel({
      uuid: 'project-1',
      simple_name: 'ProjectA',
    });
    const orphanScene = new SceneModel({
      uuid: 'scene-b',
      simple_name: 'Old Name',
    });
    project.scenes = [];
    getProjectModel().setRoot('CONTROLS', project);
    mockGetDatabaseScene.mockResolvedValue(orphanScene);

    await openSceneLinkInWorkspace('scene-b');

    expect(mockGetDatabaseScene).toHaveBeenCalledWith('scene-b');
    expect(openSceneInWorkspace).not.toHaveBeenCalled();
    expect(openUnattachedSceneInWorkspace).toHaveBeenCalledWith(orphanScene);
  });
});

describe('openDeviceSceneLinkInWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the retrieved device scene model', async () => {
    mockGetDeviceInstanceInfo.mockReturnValue(
      new Hash('capabilities', Capabilities.PROVIDES_SCENES)
    );
    mockCallDeviceSlot.mockImplementation((handler) => {
      handler(
        true,
        new Hash({
          payload: new Hash({
            data: '<svg width="100" height="100" version="1.1"></svg>',
            name: 'Device Scene',
          }),
          origin: 'device-1',
        })
      );
      return 'request-token';
    });

    await openDeviceSceneLinkInWorkspace('device-1', 'scene-a');

    expect(mockCallDeviceSlot).toHaveBeenCalledWith(
      expect.any(Function),
      'device-1',
      'requestScene',
      { name: 'scene-a' }
    );
    expect(openUnattachedSceneInWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        simple_name: 'device-1|scene-a',
        width: 100,
        height: 100,
      })
    );
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('shows an error message when the device is offline', async () => {
    mockGetDeviceInstanceInfo.mockReturnValue(undefined);

    await openDeviceSceneLinkInWorkspace('device-1', 'scene-a');

    expect(mockCallDeviceSlot).not.toHaveBeenCalled();
    expect(showMessageBox).toHaveBeenCalledWith({
      variant: 'error',
      title: 'Could not open device scene',
      msg: 'Device "device-1" not online. Cannot retrieve its "scene-a" scene.',
    });
    expect(openUnattachedSceneInWorkspace).not.toHaveBeenCalled();
  });

  it('shows an error message when the scene request fails', async () => {
    mockGetDeviceInstanceInfo.mockReturnValue(
      new Hash('capabilities', Capabilities.PROVIDES_SCENES)
    );
    mockCallDeviceSlot.mockImplementation((handler) => {
      handler(false, new Hash({ error: 'boom' }));
      return 'request-token';
    });

    await openDeviceSceneLinkInWorkspace('device-1', 'scene-a');

    expect(showMessageBox).toHaveBeenCalledWith({
      variant: 'error',
      title: 'Could not retrieve scene',
      msg: 'Request for scene "scene-a" of device "device-1" failed: "[object Map]"',
    });
    expect(openUnattachedSceneInWorkspace).not.toHaveBeenCalled();
  });
});
