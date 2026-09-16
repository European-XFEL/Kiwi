import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useRootProject } from '@/features/project/api';
import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import {
  getPanelWrangler,
  getProjectModel,
  singletons,
} from '@/lib/singletons/api';
import { useGlobalStore, useRecentStore } from '@/store/api';
import useWorkspaceRuntime from '../useWorkspaceRuntime';

jest.mock('@/features/scene-view/api', () => ({
  useActiveSceneStore: jest.requireActual(
    '@/features/scene-view/hooks/useActiveScene'
  ).useActiveSceneStore,
}));

describe('useWorkspaceRuntime', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/main');
    localStorage.clear();
    singletons.delete('config');
    getProjectModel().clearRoot();
    useRecentStore.setState({ recentScenes: new Map() });
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
    useRecentStore.setState({ recentScenes: new Map() });
    singletons.delete('config');
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('clears the project, browser filters, and scene tabs while keeping recent scenes', () => {
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
        location: useLocation(),
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

    expect(result.current.browser.selectedProject?.projectUuid).toBe('motors');
    expect(result.current.browser.query).toBe('mot');
    expect(result.current.browser.sceneQuery).toBe('motor');
    expect(wrangler.getSnapshot().center.tabs).toHaveLength(2);
    const disposeControllers = jest.spyOn(
      wrangler.getContent('scene:motor-scene')!.sceneControllerRegistry!,
      'dispose'
    );
    const recentScenes = useRecentStore
      .getState()
      .getRecentScenesForTopic('TOPIC_A');
    expect(recentScenes).toHaveLength(2);
    expect(recentScenes).toContainEqual(
      expect.objectContaining({
        uuid: 'motor-scene',
        projectUuid: 'motors',
      })
    );

    act(() => result.current.runtime.onGoHome!());

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
    expect(result.current.location.pathname).toBe('/main');
    expect(result.current.location.search).toBe('');
    expect(window.location.search).toBe('');
    expect(
      useRecentStore.getState().getRecentScenesForTopic('TOPIC_A')
    ).toEqual(recentScenes);
  });
});
