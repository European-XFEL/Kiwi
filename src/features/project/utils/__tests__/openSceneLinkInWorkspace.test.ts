import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { getProjectModel } from '@/lib/singletons/api';
import {
  openSceneLinkInWorkspace,
  sceneUuidFromLinkTarget,
} from '../openSceneLinkInWorkspace';
import { openSceneInWorkspace } from '../openSceneInWorkspace';

jest.mock('../openSceneInWorkspace', () => ({
  openSceneInWorkspace: jest.fn(),
}));

describe('openSceneLinkInWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProjectModel().root = undefined;
  });

  it('extracts a uuid from scene link targets', () => {
    expect(sceneUuidFromLinkTarget('Project:scene-1')).toBe('scene-1');
    expect(sceneUuidFromLinkTarget('scene-2')).toBe('scene-2');
  });

  it('opens the matching SceneModel from the current project root', () => {
    const sceneA = new SceneModel({ uuid: 'scene-a', simple_name: 'Scene A' });
    const sceneB = new SceneModel({ uuid: 'scene-b', simple_name: 'Scene B' });
    const project = new ProjectModel({
      uuid: 'project-1',
      simple_name: 'ProjectA',
    });
    project.scenes = [sceneA, sceneB];
    getProjectModel().setRoot('CONTROLS', project);

    openSceneLinkInWorkspace('ProjectA:scene-b');

    expect(openSceneInWorkspace).toHaveBeenCalledWith({ model: sceneB });
  });

  it('does not open anything when the uuid is not in the current project', () => {
    const project = new ProjectModel({
      uuid: 'project-1',
      simple_name: 'ProjectA',
    });
    project.scenes = [];
    getProjectModel().setRoot('CONTROLS', project);

    openSceneLinkInWorkspace('scene-b');

    expect(openSceneInWorkspace).not.toHaveBeenCalled();
  });
});
