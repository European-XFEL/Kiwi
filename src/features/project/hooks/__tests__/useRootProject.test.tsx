import { act, renderHook } from '@testing-library/react';
import { ProjectModel } from '@/karabo/common/project/api';
import { Mediator } from '@/lib/singletons/Mediator';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';

const mockMediator = new Mediator();
const mockProjectModel = new ProjectItemModel();

jest.mock('@/lib/singletons/api', () => ({
  getMediator: () => mockMediator,
  getProjectModel: () => mockProjectModel,
}));

import { useRootProject } from '../useRootProject';

function makeProject(uuid: string, simple_name = uuid): ProjectModel {
  const project = new ProjectModel({ uuid, simple_name });
  project.initialized = true;
  return project;
}

describe('useRootProject', () => {
  beforeEach(() => {
    mockProjectModel.clearRoot();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('has no navigation while no project is active', () => {
    const { result } = renderHook(() => useRootProject());

    expect(result.current.rootProject).toBeUndefined();
    expect(result.current.selectedProject).toBeUndefined();
    expect(result.current.projects).toEqual([]);
  });

  // The announcement reaches only listeners that are already subscribed, so a
  // project activated before this mounted is read directly from the singleton.
  it('reads a root that was activated before it mounted', () => {
    const root = makeProject('root', 'Experiment');
    root.subprojects = [makeProject('motors', 'Motors')];
    mockProjectModel.setRoot('CONTROLS', root);

    const { result } = renderHook(() => useRootProject());

    expect(result.current.rootProject?.projectUuid).toBe('root');
    expect(result.current.selectedProject?.projectUuid).toBe('root');
    expect(
      result.current.projects.map((project) => project.projectUuid)
    ).toEqual(['root', 'motors']);
  });

  // Seeding from a mount effect instead would render empty navigation for one
  // frame, flashing a blank breadcrumb every time the view remounts.
  it('renders that root on the very first render', () => {
    mockProjectModel.setRoot('CONTROLS', makeProject('root', 'Experiment'));

    const rendered: (string | undefined)[] = [];
    renderHook(() => {
      const browser = useRootProject();
      rendered.push(browser.rootProject?.projectUuid);
      return browser;
    });

    expect(rendered[0]).toBe('root');
  });

  it('rebuilds when a root is activated while mounted', () => {
    const { result } = renderHook(() => useRootProject());
    expect(result.current.rootProject).toBeUndefined();
    expect(result.current.selectedProject).toBeUndefined();
    expect(result.current.projects).toEqual([]);

    act(() => {
      mockProjectModel.setRoot('CONTROLS', makeProject('root', 'Experiment'));
    });

    expect(result.current.rootProject?.projectName).toBe('Experiment');
  });

  // The tree is filled in place while loading, so the root keeps its identity
  // while gaining children. Rebuilding on the announcement rather than on a
  // changed root reference is what makes those children appear.
  it('rebuilds when the same root object gains subprojects', () => {
    const root = makeProject('root', 'Experiment');
    mockProjectModel.setRoot('CONTROLS', root);

    const { result } = renderHook(() => useRootProject());
    expect(result.current.projects.length).toBe(1);

    act(() => {
      root.subprojects = [makeProject('motors', 'Motors')];
      mockProjectModel.setRoot('CONTROLS', root);
    });

    expect(result.current.projects.length).toBe(2);
    expect(
      result.current.projects.find(
        (project) => project.projectUuid === 'motors'
      )?.projectName
    ).toBe('Motors');
  });

  it('drops navigation when the active project is cleared', () => {
    mockProjectModel.setRoot('CONTROLS', makeProject('root', 'Experiment'));
    const { result } = renderHook(() => useRootProject());
    expect(result.current.rootProject).toBeDefined();

    act(() => {
      mockProjectModel.clearRoot();
    });

    expect(result.current.rootProject).toBeUndefined();
    expect(result.current.selectedProject).toBeUndefined();
    expect(result.current.projects).toEqual([]);
  });

  it('filters the list without changing selection and clears the query on selection', () => {
    const root = makeProject('root', 'Experiment');
    root.subprojects = [makeProject('motors', 'Motors')];
    mockProjectModel.setRoot('CONTROLS', root);
    const { result } = renderHook(() => useRootProject());

    act(() => result.current.setQuery('  MOT  '));

    expect(
      result.current.projects.map((project) => project.projectUuid)
    ).toEqual(['motors']);
    expect(result.current.rootProject?.projectUuid).toBe('root');
    expect(result.current.selectedProject?.projectUuid).toBe('root');

    act(() => result.current.selectProject('motors'));

    expect(result.current.selectedProject?.projectUuid).toBe('motors');
    expect(result.current.query).toBe('');
    expect(result.current.projects).toHaveLength(2);
  });

  it('keeps selection across refreshes and falls back to the root when the selected project disappears', () => {
    const root = makeProject('root', 'Experiment');
    const motors = makeProject('motors', 'Motors');
    root.subprojects = [motors];
    mockProjectModel.setRoot('CONTROLS', root);
    const { result } = renderHook(() => useRootProject());

    act(() => result.current.selectProject('motors'));
    act(() => {
      motors.simple_name = 'Updated Motors';
      mockProjectModel.setRoot('CONTROLS', root);
    });

    expect(result.current.selectedProject?.projectName).toBe('Updated Motors');

    act(() => {
      root.subprojects = [];
      mockProjectModel.setRoot('CONTROLS', root);
    });

    expect(result.current.selectedProject?.projectUuid).toBe('root');
    expect(result.current.projects).toHaveLength(1);
  });

  it('stops listening once unmounted', () => {
    const { unmount } = renderHook(() => useRootProject());
    unmount();
    const readRoot = jest.spyOn(mockProjectModel, 'root', 'get');

    act(() => {
      mockProjectModel.setRoot('CONTROLS', makeProject('root', 'Experiment'));
    });

    expect(readRoot).not.toHaveBeenCalled();
  });
});
