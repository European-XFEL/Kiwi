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

import { useProjectBrowser } from '../useProjectBrowser';

function makeProject(uuid: string, simple_name = uuid): ProjectModel {
  const project = new ProjectModel({ uuid, simple_name });
  project.initialized = true;
  return project;
}

describe('useProjectBrowser', () => {
  beforeEach(() => {
    mockProjectModel.clearRoot();
  });

  it('has no navigation while no project is active', () => {
    const { result } = renderHook(() => useProjectBrowser());

    expect(result.current).toBeUndefined();
  });

  // The announcement reaches only listeners that are already subscribed, so a
  // project activated before this mounted is read directly from the singleton.
  it('reads a root that was activated before it mounted', () => {
    const root = makeProject('root', 'Experiment');
    root.subprojects = [makeProject('motors', 'Motors')];
    mockProjectModel.setRoot('CONTROLS', root);

    const { result } = renderHook(() => useProjectBrowser());

    expect(result.current?.rootProjectUuid).toBe('root');
    expect(result.current?.projectsByUuid.get('root')?.subprojectUuids).toEqual(
      ['motors']
    );
  });

  // Seeding from a mount effect instead would render empty navigation for one
  // frame, flashing a blank breadcrumb every time the view remounts.
  it('renders that root on the very first render', () => {
    mockProjectModel.setRoot('CONTROLS', makeProject('root', 'Experiment'));

    const rendered: (string | undefined)[] = [];
    renderHook(() => {
      const browser = useProjectBrowser();
      rendered.push(browser?.rootProjectUuid);
      return browser;
    });

    expect(rendered[0]).toBe('root');
  });

  it('rebuilds when a root is activated while mounted', () => {
    const { result } = renderHook(() => useProjectBrowser());
    expect(result.current).toBeUndefined();

    act(() => {
      mockProjectModel.setRoot('CONTROLS', makeProject('root', 'Experiment'));
    });

    expect(result.current?.projectsByUuid.get('root')?.projectName).toBe(
      'Experiment'
    );
  });

  // The tree is filled in place while loading, so the root keeps its identity
  // while gaining children. Rebuilding on the announcement rather than on a
  // changed root reference is what makes those children appear.
  it('rebuilds when the same root object gains subprojects', () => {
    const root = makeProject('root', 'Experiment');
    mockProjectModel.setRoot('CONTROLS', root);

    const { result } = renderHook(() => useProjectBrowser());
    expect(result.current?.projectsByUuid.size).toBe(1);

    act(() => {
      root.subprojects = [makeProject('motors', 'Motors')];
      mockProjectModel.setRoot('CONTROLS', root);
    });

    expect(result.current?.projectsByUuid.size).toBe(2);
    expect(result.current?.projectsByUuid.get('motors')?.projectName).toBe(
      'Motors'
    );
  });

  it('drops navigation when the active project is cleared', () => {
    mockProjectModel.setRoot('CONTROLS', makeProject('root', 'Experiment'));
    const { result } = renderHook(() => useProjectBrowser());
    expect(result.current).toBeDefined();

    act(() => {
      mockProjectModel.clearRoot();
    });

    expect(result.current).toBeUndefined();
  });

  it('stops listening once unmounted', () => {
    const { result, unmount } = renderHook(() => useProjectBrowser());
    unmount();

    act(() => {
      mockProjectModel.setRoot('CONTROLS', makeProject('root', 'Experiment'));
    });

    expect(result.current).toBeUndefined();
  });
});
