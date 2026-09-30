import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useRootProject } from '@/features/project/api';
import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Hash } from '@/karabo/data/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import {
  getNetwork,
  getPanelWrangler,
  getProjectModel,
  singletons,
} from '@/lib/singletons/api';
import { useGlobalStore } from '@/store/api';
import useWorkspaceRuntime from '../useWorkspaceRuntime';

describe('useWorkspaceRuntime', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/main');
    localStorage.clear();
    singletons.delete('config');
    getProjectModel().clearRoot();
    useGlobalStore.getState().setLoggedIn({
      loggedUser: 'test-user',
      accessLevel: 4,
      isReadOnly: false,
      guiServerHost: 'host-a',
      guiServerPort: 44444,
      guiServerTopic: 'TOPIC_A',
      guiServerVersion: '2.20.0',
      sessionStartEpoc: Date.now(),
    });
  });

  afterEach(() => {
    cleanup();
    getPanelWrangler().dispose();
    singletons.delete('panel_wrangler');
    getProjectModel().clearRoot();
    useGlobalStore.getState().reset();
    singletons.delete('config');
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('reports whether a scene tab is open', () => {
    const first = new SceneModel({
      uuid: 'first',
      simple_name: 'First',
      initialized: true,
    });
    const second = new SceneModel({
      uuid: 'second',
      simple_name: 'Second',
      initialized: true,
    });
    const project = new ProjectModel({
      uuid: 'project',
      simple_name: 'Project',
    });
    project.scenes = [first, second];
    getProjectModel().setRoot('CONTROLS', project);
    const wrangler = getPanelWrangler();
    const { result } = renderHook(
      () => ({
        runtime: useWorkspaceRuntime(),
        browser: useRootProject(),
      }),
      { wrapper: MemoryRouter }
    );
    expect(result.current.runtime.sceneTabOpen).toBe(false);

    act(() => {
      result.current.browser.openScene(first.uuid);
      result.current.browser.openScene(second.uuid);
    });
    expect(result.current.runtime.sceneTabOpen).toBe(true);

    act(() => wrangler.closeTab('center', 'scene:first'));
    expect(result.current.runtime.sceneTabOpen).toBe(true);
    act(() => wrangler.closeTab('center', 'scene:second'));
    expect(result.current.runtime.sceneTabOpen).toBe(false);
  });

  it('reports whether a project is loading', () => {
    const { result } = renderHook(() => useWorkspaceRuntime(), {
      wrapper: MemoryRouter,
    });
    expect(result.current.projectLoading).toBe(false);

    act(() => {
      broadcast_event(
        KaraboEvent.DatabaseBusy,
        new Hash('is_processing', true)
      );
    });
    expect(result.current.projectLoading).toBe(true);

    act(() => {
      broadcast_event(
        KaraboEvent.DatabaseBusy,
        new Hash('is_processing', false, 'loading_failed', true)
      );
    });
    expect(result.current.projectLoading).toBe(false);
  });

  it('opens scenes without recording history and clears the workspace when going to the Home tab', () => {
    const overview = new SceneModel({
      uuid: 'overview',
      simple_name: 'Overview',
      initialized: true,
    });
    const motorScene = new SceneModel({
      uuid: 'motor-scene',
      simple_name: 'Motor Scene',
      initialized: true,
    });
    const motors = new ProjectModel({ uuid: 'motors', simple_name: 'Motors' });
    motors.initialized = true;
    motors.scenes = [motorScene];
    const root = new ProjectModel({
      uuid: 'experiment',
      simple_name: 'Experiment',
    });
    root.initialized = true;
    root.scenes = [overview];
    root.subprojects = [motors];
    getProjectModel().setRoot('CONTROLS', root);
    const wrangler = getPanelWrangler();

    const { result } = renderHook(
      () => ({
        runtime: useWorkspaceRuntime(),
        browser: useRootProject(),
      }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <MemoryRouter
            initialEntries={[
              '/main?host=host-a&port=44444&domain=CONTROLS&projectUuid=motors&sceneUuid=motor-scene',
            ]}
          >
            {children}
          </MemoryRouter>
        ),
      }
    );

    act(() => {
      result.current.browser.openScene(overview.uuid);
      result.current.browser.selectProject(motors.uuid);
      result.current.browser.openScene(motorScene.uuid);
      result.current.browser.setQuery('mot');
      result.current.browser.setSceneQuery('motor');
    });

    expect(result.current.runtime.sceneTabOpen).toBe(true);
    expect(result.current.browser.selectedProject?.projectUuid).toBe('motors');
    expect(result.current.browser.query).toBe('mot');
    expect(result.current.browser.sceneQuery).toBe('motor');
    expect(wrangler.getSnapshot().center.tabs).toHaveLength(2);
    const disposeControllers = jest.spyOn(
      wrangler.getContent('scene:motor-scene')!.sceneControllerRegistry!,
      'dispose'
    );
    expect(localStorage.getItem('kiwi/project:recentScenesByTopic')).toBeNull();

    act(() => result.current.runtime.onGoToHomeTab!());

    expect(result.current.runtime.sceneTabOpen).toBe(false);
    expect(getProjectModel().root).toBeUndefined();
    expect(getProjectModel().domain).toBeUndefined();
    expect(result.current.browser.rootProject).toBeUndefined();
    expect(result.current.browser.selectedProject).toBeUndefined();
    expect(result.current.browser.projects).toEqual([]);
    expect(result.current.browser.filteredScenes).toEqual([]);
    expect(result.current.browser.query).toBe('');
    expect(result.current.browser.sceneQuery).toBe('');
    expect(wrangler.getSnapshot().center).toEqual({
      id: 'center',
      activeTabId: 'home',
      tabs: [{ id: 'home', title: 'Home', closable: false }],
    });
    expect(wrangler.getContent('scene:overview')).toBeUndefined();
    expect(wrangler.getContent('scene:motor-scene')).toBeUndefined();
    expect(disposeControllers).toHaveBeenCalledTimes(1);
  });

  it('hands the header the session, access, and activity state', () => {
    const { result } = renderHook(() => useWorkspaceRuntime(), {
      wrapper: MemoryRouter,
    });

    expect(result.current.user).toMatchObject({
      loggedUser: 'test-user',
      topic: 'TOPIC_A',
    });
    expect(result.current.access?.accessLevel).toBe(4);
    expect(result.current.activity).toEqual({
      lastActivity: null,
      activityLevel: 'idle',
    });
    expect(result.current.browser).toMatchObject({ rootProject: undefined });
  });

  it('gives the header no user or access state without a session', () => {
    useGlobalStore.getState().reset();

    const { result } = renderHook(() => useWorkspaceRuntime(), {
      wrapper: MemoryRouter,
    });

    expect(result.current.user).toBeUndefined();
    expect(result.current.access).toBeUndefined();
  });

  it('logs out and returns to the start page', () => {
    const finishSession = jest
      .spyOn(getNetwork(), 'finishSession')
      .mockImplementation(() => undefined);
    const { result } = renderHook(
      () => ({ runtime: useWorkspaceRuntime(), location: useLocation() }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <MemoryRouter initialEntries={['/main']}>{children}</MemoryRouter>
        ),
      }
    );

    act(() => result.current.runtime.user!.onLogout());

    expect(finishSession).toHaveBeenCalledTimes(1);
    expect(useGlobalStore.getState().sessionInfo).toBeUndefined();
    expect(result.current.location.pathname).toBe('/');
  });
});
