import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Hash, HashList } from '@/karabo/data/api';
import { KaraboEvent } from '@/lib/events';
import { showMessageBox } from '@/lib/messagebox';
import { Mediator } from '@/lib/singletons/Mediator';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';
import {
  clearRootProject,
  loadRootProjectFromBookmark,
  loadRootProjectFromDialogSelection,
} from '../rootProjectActions';

let mockMediator: Mediator;
let mockProjectModel: ProjectItemModel;
const mockListProjects = jest.fn();
const mockLoadProject = jest.fn();

jest.mock('@/lib/singletons/api', () => ({
  getDbConn: () => ({
    listProjects: mockListProjects,
    loadProject: mockLoadProject,
  }),
  getMediator: () => mockMediator,
  getProjectModel: () => mockProjectModel,
}));

jest.mock('@/lib/messagebox', () => ({ showMessageBox: jest.fn() }));

function makeProject(uuid: string, simple_name = uuid): ProjectModel {
  return new ProjectModel({ uuid, simple_name });
}

function makeScene(uuid: string, simple_name = uuid): SceneModel {
  return new SceneModel({ uuid, simple_name, initialized: true });
}

function emitProjects(projects: ProjectModel[], reason = '') {
  mockMediator.postEvent(
    KaraboEvent.ListProjects,
    new Hash({
      reason,
      'reply.items': new HashList(
        projects.map(
          (project) =>
            new Hash({
              uuid: project.uuid,
              simple_name: project.simple_name,
              date: project.date,
              is_trashed: project.is_trashed,
            })
        )
      ),
    })
  );
}

function completeProject(project: ProjectModel, scenes: SceneModel[]) {
  project.scenes = scenes;
  project.initialized = true;
  mockMediator.postEvent(
    KaraboEvent.DatabaseBusy,
    new Hash({ is_processing: false })
  );
}

// Capture the model as each event is delivered, not just its final state.
function observeActivation() {
  const events: {
    event: KaraboEvent;
    root?: ProjectModel;
    scene?: SceneModel;
  }[] = [];
  mockMediator.on(KaraboEvent.RootProjectChanged, () => {
    events.push({
      event: KaraboEvent.RootProjectChanged,
      root: mockProjectModel.root,
    });
  });
  mockMediator.on(KaraboEvent.OpenScene, (data: { model: SceneModel }) => {
    events.push({
      event: KaraboEvent.OpenScene,
      root: mockProjectModel.root,
      scene: data.model,
    });
  });
  return events;
}

const bookmark = {
  domain: 'CONTROLS',
  projectUuid: 'motors',
  sceneUuid: 'motor-scene',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockListProjects.mockReset();
  mockLoadProject.mockReset();
  mockMediator = new Mediator();
  mockProjectModel = new ProjectItemModel();
});

describe('loadRootProjectFromBookmark', () => {
  it('loads the bookmarked project and announces its root before opening the scene', async () => {
    const project = makeProject('motors', 'Motors');
    const scene = makeScene('motor-scene', 'Motor Scene');
    mockListProjects.mockImplementation(() => emitProjects([project]));
    mockLoadProject.mockImplementation(
      (_domain: string, loaded: ProjectModel) => {
        completeProject(loaded, [scene]);
      }
    );
    const events = observeActivation();

    await loadRootProjectFromBookmark(bookmark).promise;

    const root = mockProjectModel.root;
    expect(root?.uuid).toBe('motors');
    expect(mockProjectModel.domain).toBe('CONTROLS');
    expect(mockLoadProject).toHaveBeenCalledWith('CONTROLS', root);
    expect(events).toEqual([
      { event: KaraboEvent.RootProjectChanged, root },
      { event: KaraboEvent.OpenScene, root, scene },
    ]);
  });

  it('loads a fresh subproject as root even when the active root contains it', async () => {
    const child = makeProject('motors', 'Motors');
    child.initialized = true;
    child.scenes = [makeScene('motor-scene', 'Old Motor Scene')];
    const parent = makeProject('experiment', 'Experiment');
    parent.subprojects = [child];
    parent.initialized = true;
    mockProjectModel.setRoot('CONTROLS', parent);
    const freshScene = makeScene('motor-scene', 'Updated Motor Scene');
    mockListProjects.mockImplementation(() => emitProjects([parent, child]));
    mockLoadProject.mockImplementation(
      (_domain: string, loaded: ProjectModel) => {
        completeProject(loaded, [freshScene]);
      }
    );
    const events = observeActivation();

    await loadRootProjectFromBookmark(bookmark).promise;

    expect(mockListProjects).toHaveBeenCalledWith('CONTROLS');
    expect(mockProjectModel.root?.uuid).toBe(child.uuid);
    expect(mockProjectModel.root).not.toBe(child);
    expect(mockProjectModel.root).not.toBe(parent);
    expect(events).toEqual([
      { event: KaraboEvent.RootProjectChanged, root: mockProjectModel.root },
      {
        event: KaraboEvent.OpenScene,
        root: mockProjectModel.root,
        scene: freshScene,
      },
    ]);
  });

  it('reloads even when the bookmarked project is already the active root', async () => {
    const active = makeProject('motors', 'Motors');
    active.initialized = true;
    active.scenes = [makeScene('motor-scene')];
    mockProjectModel.setRoot('CONTROLS', active);
    const freshScene = makeScene('motor-scene', 'Updated Motor Scene');
    mockListProjects.mockImplementation(() => emitProjects([active]));
    mockLoadProject.mockImplementation(
      (_domain: string, loaded: ProjectModel) => {
        completeProject(loaded, [freshScene]);
      }
    );

    await loadRootProjectFromBookmark(bookmark).promise;

    expect(mockProjectModel.root?.uuid).toBe(active.uuid);
    expect(mockProjectModel.root).not.toBe(active);
    expect(mockProjectModel.root?.scenes).toEqual([freshScene]);
  });

  it('ignores obsolete parent context on a saved entry', async () => {
    const project = makeProject('motors');
    const scene = makeScene('motor-scene');
    const savedEntry = { ...bookmark, rootProjectUuid: 'deleted-parent' };
    mockListProjects.mockImplementation(() => emitProjects([project]));
    mockLoadProject.mockImplementation(
      (_domain: string, loaded: ProjectModel) => {
        completeProject(loaded, [scene]);
      }
    );

    await loadRootProjectFromBookmark(savedEntry).promise;

    expect(mockProjectModel.root?.uuid).toBe('motors');
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('keeps the active root when the bookmarked project is missing', async () => {
    const active = makeProject('existing');
    mockProjectModel.setRoot('CONTROLS', active);
    mockListProjects.mockImplementation(() => emitProjects([active]));
    const events = observeActivation();

    await expect(loadRootProjectFromBookmark(bookmark).promise).rejects.toThrow(
      'Project "motors" was not found in CONTROLS.'
    );

    expect(mockLoadProject).not.toHaveBeenCalled();
    expect(mockProjectModel.root).toBe(active);
    expect(events).toEqual([]);
    expect(showMessageBox).toHaveBeenCalledTimes(1);
  });

  it('reports a project-list failure without loading or activating a project', async () => {
    mockListProjects.mockImplementation(() =>
      emitProjects([], 'Database unavailable')
    );
    const events = observeActivation();

    await expect(loadRootProjectFromBookmark(bookmark).promise).rejects.toThrow(
      'Database unavailable'
    );

    expect(mockLoadProject).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('keeps the active root when project loading fails', async () => {
    const active = makeProject('existing');
    mockProjectModel.setRoot('CONTROLS', active);
    mockListProjects.mockImplementation(() =>
      emitProjects([makeProject('motors')])
    );
    mockLoadProject.mockImplementation(() => {
      mockMediator.postEvent(
        KaraboEvent.DatabaseBusy,
        new Hash({
          is_processing: false,
          loading_failed: true,
        })
      );
    });
    const events = observeActivation();

    await expect(loadRootProjectFromBookmark(bookmark).promise).rejects.toThrow(
      'Could not load project "motors".'
    );

    expect(mockProjectModel.root).toBe(active);
    expect(events).toEqual([]);
  });

  it('validates the scene before replacing the active root', async () => {
    const active = makeProject('existing');
    mockProjectModel.setRoot('CONTROLS', active);
    mockListProjects.mockImplementation(() =>
      emitProjects([makeProject('motors')])
    );
    mockLoadProject.mockImplementation(
      (_domain: string, loaded: ProjectModel) => {
        completeProject(loaded, [makeScene('other-scene')]);
      }
    );
    const events = observeActivation();

    await expect(loadRootProjectFromBookmark(bookmark).promise).rejects.toThrow(
      'Scene "motor-scene" was not found in project "motors".'
    );

    expect(mockProjectModel.root).toBe(active);
    expect(events).toEqual([]);
  });

  it('cancels a pending lookup without changing the root or reporting an error', async () => {
    const active = makeProject('existing');
    mockProjectModel.setRoot('CONTROLS', active);
    const events = observeActivation();
    const handle = loadRootProjectFromBookmark(bookmark);

    handle.abort();
    await expect(handle.promise).rejects.toThrow(
      'Scene loading was cancelled.'
    );
    emitProjects([makeProject('motors')]);

    expect(mockLoadProject).not.toHaveBeenCalled();
    expect(mockProjectModel.root).toBe(active);
    expect(events).toEqual([]);
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('does not activate or open a scene when cancelled just after its project reply', async () => {
    const active = makeProject('existing');
    mockProjectModel.setRoot('CONTROLS', active);
    mockListProjects.mockImplementation(() =>
      emitProjects([makeProject('motors')])
    );
    mockLoadProject.mockImplementation(
      (_domain: string, loaded: ProjectModel) => {
        completeProject(loaded, [makeScene('motor-scene')]);
        handle.abort();
      }
    );
    const events = observeActivation();

    const handle = loadRootProjectFromBookmark(bookmark);
    await expect(handle.promise).rejects.toThrow(
      'Scene loading was cancelled.'
    );

    expect(mockProjectModel.root).toBe(active);
    expect(events).toEqual([]);
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('rejects an empty project selection before requesting data', async () => {
    await expect(
      loadRootProjectFromBookmark({ ...bookmark, projectUuid: '' }).promise
    ).rejects.toThrow('A project UUID is required to open a scene.');

    expect(mockListProjects).not.toHaveBeenCalled();
    expect(mockLoadProject).not.toHaveBeenCalled();
  });
});

describe('loadRootProjectFromDialogSelection', () => {
  it('reloads the selected project and opens the full scene model in the selected domain', async () => {
    const selected = makeProject('motors');
    selected.initialized = true;
    selected.scenes = [makeScene('motor-scene', 'Old Scene')];
    mockProjectModel.setRoot('OTHER_DOMAIN', selected);
    const partialScene = new SceneModel({ uuid: 'motor-scene' });
    const fullScene = makeScene('motor-scene', 'Full Scene');
    mockListProjects.mockImplementation(() => emitProjects([selected]));
    mockLoadProject.mockImplementation(
      (_domain: string, loaded: ProjectModel) => {
        completeProject(loaded, [fullScene]);
      }
    );
    const events = observeActivation();

    await loadRootProjectFromDialogSelection('CONTROLS', selected, partialScene)
      .promise;

    expect(mockListProjects).toHaveBeenCalledWith('CONTROLS');
    expect(mockProjectModel.domain).toBe('CONTROLS');
    expect(mockProjectModel.root?.uuid).toBe(selected.uuid);
    expect(mockProjectModel.root).not.toBe(selected);
    expect(events).toEqual([
      { event: KaraboEvent.RootProjectChanged, root: mockProjectModel.root },
      {
        event: KaraboEvent.OpenScene,
        root: mockProjectModel.root,
        scene: fullScene,
      },
    ]);
  });
});

describe('clearRootProject', () => {
  it('clears the model before announcing the change to the browser', () => {
    mockProjectModel.setRoot('CONTROLS', makeProject('motors'));
    const events = observeActivation();

    clearRootProject();

    expect(mockProjectModel.root).toBeUndefined();
    expect(mockProjectModel.domain).toBeUndefined();
    expect(events).toEqual([
      { event: KaraboEvent.RootProjectChanged, root: undefined },
    ]);
  });
});
