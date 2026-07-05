import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Hash, HashList } from '@/karabo/data/hash';
import { KaraboEvent } from '@/lib/events';
import { showMessageBox } from '@/lib/messagebox';
import { startSceneFromRoute } from '../openSceneFromRoute';
import { openSceneInWorkspace } from '../openSceneInWorkspace';

const mockEventListeners = new Map<KaraboEvent, (hash: Hash) => void>();
const mockListProjects = jest.fn();
const mockLoadProject = jest.fn();
const mockSetRoot = jest.fn();

const mockProjectModelState: {
  domain?: string;
  root?: ProjectModel;
  setRoot: (domain: string, project: ProjectModel) => void;
} = {
  domain: undefined,
  root: undefined,
  setRoot(domain: string, project: ProjectModel) {
    this.domain = domain;
    this.root = project;
    mockSetRoot(domain, project);
  },
};

jest.mock('@/lib/singletons/api', () => ({
  getDbConn: () => ({
    listProjects: mockListProjects,
    loadProject: mockLoadProject,
  }),
  getMediator: () => ({
    on: (event: KaraboEvent, callback: (hash: Hash) => void) => {
      mockEventListeners.set(event, callback);
      return () => {
        mockEventListeners.delete(event);
      };
    },
  }),
  getProjectModel: () => mockProjectModelState,
}));

jest.mock('../openSceneInWorkspace', () => ({
  openSceneInWorkspace: jest.fn(),
}));

jest.mock('@/lib/messagebox', () => ({
  showMessageBox: jest.fn(),
}));

function makeProject(uuid: string, name: string): ProjectModel {
  return new ProjectModel({
    uuid,
    simple_name: name,
    date: '2026-07-01T00:00:00',
  });
}

function makeScene(uuid: string, name: string): SceneModel {
  return new SceneModel({
    uuid,
    simple_name: name,
    width: 800,
    height: 600,
    initialized: true,
  });
}

function emitProjects(projects: ProjectModel[]) {
  const hash = new Hash();
  hash.set('reason', '');
  hash.set(
    'reply.items',
    new HashList(
      projects.map(
        (project) =>
          new Hash({
            uuid: project.uuid,
            date: project.date,
            simple_name: project.simple_name,
            is_trashed: project.is_trashed,
          })
      )
    )
  );
  mockEventListeners.get(KaraboEvent.ListProjects)?.(hash);
}

function emitScenesLoaded() {
  mockEventListeners.get(KaraboEvent.DatabaseBusy)?.(
    new Hash({ is_processing: false })
  );
}

describe('startSceneFromRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventListeners.clear();
    mockProjectModelState.domain = undefined;
    mockProjectModelState.root = undefined;
  });

  it('loads the project by uuid before opening the scene model', async () => {
    const firstProject = makeProject('project-1', 'SharedProject');
    firstProject.scenes = [makeScene('scene-a', 'Scene A')];
    firstProject.initialized = true;

    const secondProject = makeProject('project-2', 'SharedProject');
    const targetScene = makeScene('scene-b', 'Scene B');
    secondProject.scenes = [targetScene];
    secondProject.initialized = true;

    mockListProjects.mockImplementation(() => {
      emitProjects([firstProject, secondProject]);
    });
    mockLoadProject.mockImplementation(
      (_domain: string, project: ProjectModel) => {
        if (project.uuid === firstProject.uuid) {
          project.scenes = firstProject.scenes;
          project.initialized = true;
        }
        if (project.uuid === secondProject.uuid) {
          project.scenes = secondProject.scenes;
          project.initialized = true;
        }
        emitScenesLoaded();
      }
    );

    const handle = startSceneFromRoute({
      host: 'host-a',
      port: 44444,
      domain: 'CONTROLS',
      projectUuid: 'project-2',
      sceneUuid: 'scene-b',
    });
    await handle.promise;

    expect(mockListProjects).toHaveBeenCalledWith('CONTROLS');
    expect(mockLoadProject).toHaveBeenCalledWith('CONTROLS', secondProject);
    expect(mockSetRoot).toHaveBeenCalledWith('CONTROLS', secondProject);
    expect(openSceneInWorkspace).toHaveBeenCalledWith({ model: targetScene });
  });

  it('creates an abortable scene route load handle', async () => {
    const handle = startSceneFromRoute({
      host: 'host-a',
      port: 44444,
      domain: 'CONTROLS',
      projectUuid: 'project-2',
      sceneUuid: 'scene-b',
    });

    expect(handle.controller).toBeInstanceOf(AbortController);
    expect(handle.controller.signal.aborted).toBe(false);

    handle.abort();
    expect(handle.controller.signal.aborted).toBe(true);
    await expect(handle.promise).rejects.toThrow(
      'Scene loading was cancelled.'
    );
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('rejects routes without a project uuid', async () => {
    const handle = startSceneFromRoute({
      host: 'host-a',
      port: 44444,
      domain: 'CONTROLS',
      projectUuid: '',
      sceneUuid: 'scene-b',
    });

    await expect(handle.promise).rejects.toThrow(
      'Scene route is missing the project UUID.'
    );

    expect(mockListProjects).not.toHaveBeenCalled();
    expect(mockLoadProject).not.toHaveBeenCalled();
    expect(showMessageBox).toHaveBeenCalledWith({
      variant: 'error',
      title: 'Could not open scene',
      msg: 'Scene route is missing the project UUID.',
    });
    expect(openSceneInWorkspace).not.toHaveBeenCalled();
  });
});
