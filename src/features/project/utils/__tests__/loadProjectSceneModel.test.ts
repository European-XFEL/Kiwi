import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Hash, HashList } from '@/karabo/data/hash';
import { KaraboEvent } from '@/lib/events';
import { loadProjectSceneModel } from '../loadProjectSceneModel';

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

function emitProjects(projects: ProjectModel[], reason = '') {
  const hash = new Hash();
  hash.set('reason', reason);
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

function emitProjectLoaded(loadingFailed = false) {
  const values: Record<string, boolean> = {
    is_processing: false,
  };
  if (loadingFailed) {
    values.loading_failed = true;
  }
  mockEventListeners.get(KaraboEvent.DatabaseBusy)?.(new Hash(values));
}

describe('loadProjectSceneModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventListeners.clear();
    mockProjectModelState.domain = undefined;
    mockProjectModelState.root = undefined;
  });

  it('loads the project by uuid before returning the requested scene model', async () => {
    const project = makeProject('project-2', 'SharedProject');
    const targetScene = makeScene('scene-b', 'Scene B');

    mockListProjects.mockImplementation(() => {
      emitProjects([project]);
    });
    mockLoadProject.mockImplementation(
      (_domain: string, loadedProject: ProjectModel) => {
        loadedProject.scenes = [targetScene];
        loadedProject.initialized = true;
        emitProjectLoaded();
      }
    );

    const scene = await loadProjectSceneModel({
      domain: 'CONTROLS',
      projectUuid: 'project-2',
      sceneUuid: 'scene-b',
    });

    expect(scene).toBe(targetScene);
    expect(mockListProjects).toHaveBeenCalledWith('CONTROLS');
    expect(mockLoadProject).toHaveBeenCalledWith(
      'CONTROLS',
      expect.objectContaining({
        uuid: 'project-2',
        simple_name: 'SharedProject',
      })
    );
    expect(mockSetRoot).toHaveBeenCalledWith(
      'CONTROLS',
      expect.objectContaining({
        uuid: 'project-2',
        simple_name: 'SharedProject',
      })
    );
  });

  it('reuses the current project model when the target project is already loaded', async () => {
    const targetScene = makeScene('scene-a', 'Scene A');
    const rootProject = makeProject('project-1', 'Root Project');
    rootProject.scenes = [targetScene];
    rootProject.initialized = true;
    mockProjectModelState.domain = 'CONTROLS';
    mockProjectModelState.root = rootProject;

    const scene = await loadProjectSceneModel({
      domain: 'CONTROLS',
      projectUuid: 'project-1',
      sceneUuid: 'scene-a',
    });

    expect(scene).toBe(targetScene);
    expect(mockListProjects).not.toHaveBeenCalled();
    expect(mockLoadProject).not.toHaveBeenCalled();
    expect(mockSetRoot).toHaveBeenCalledWith('CONTROLS', rootProject);
  });

  it('fails when the target project uuid is missing from the listed projects', async () => {
    const project = makeProject('project-1', 'Other Project');

    mockListProjects.mockImplementation(() => {
      emitProjects([project]);
    });

    await expect(
      loadProjectSceneModel({
        domain: 'CONTROLS',
        projectUuid: 'project-2',
        sceneUuid: 'scene-a',
      })
    ).rejects.toThrow('Project "project-2" was not found in CONTROLS.');

    expect(mockLoadProject).not.toHaveBeenCalled();
    expect(mockSetRoot).not.toHaveBeenCalled();
  });

  it('fails when project loading reports an error', async () => {
    const project = makeProject('project-2', 'SharedProject');

    mockListProjects.mockImplementation(() => {
      emitProjects([project]);
    });
    mockLoadProject.mockImplementation(() => {
      emitProjectLoaded(true);
    });

    await expect(
      loadProjectSceneModel({
        domain: 'CONTROLS',
        projectUuid: 'project-2',
        sceneUuid: 'scene-b',
      })
    ).rejects.toThrow('Could not load project "SharedProject".');

    expect(mockSetRoot).not.toHaveBeenCalled();
  });

  it('fails when the requested scene is absent after loading the project', async () => {
    const project = makeProject('project-2', 'SharedProject');

    mockListProjects.mockImplementation(() => {
      emitProjects([project]);
    });
    mockLoadProject.mockImplementation(
      (_domain: string, loadedProject: ProjectModel) => {
        loadedProject.scenes = [makeScene('scene-a', 'Scene A')];
        loadedProject.initialized = true;
        emitProjectLoaded();
      }
    );

    await expect(
      loadProjectSceneModel({
        domain: 'CONTROLS',
        projectUuid: 'project-2',
        sceneUuid: 'scene-b',
      })
    ).rejects.toThrow(
      'Scene "scene-b" was not found in project "SharedProject".'
    );

    expect(mockSetRoot).toHaveBeenCalledWith(
      'CONTROLS',
      expect.objectContaining({
        uuid: 'project-2',
        simple_name: 'SharedProject',
      })
    );
  });
});
