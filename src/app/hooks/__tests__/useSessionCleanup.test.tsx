import { act, renderHook } from '@testing-library/react';
import { ProjectModel } from '@/karabo/common/project/api';
import { DisplayTextLogModel, SceneModel } from '@/karabo/common/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { Mediator } from '@/lib/singletons/Mediator';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { CINEMA_TAB_ID } from '@/features/cinema/api';
import { createWorkspacePolicy } from '@/features/workspace/configuration';

let mockPanelWrangler: PanelWrangler;
let mockResetWorkspace: jest.SpyInstance;
const mockResetDb = jest.fn();
const mockProjectModel = new ProjectItemModel();
const mockMediator = new Mediator();

jest.mock('@/lib/singletons/api', () => ({
  getPanelWrangler: () => ({
    resetWorkspace: () => mockPanelWrangler.resetWorkspace(),
  }),
  getDbConn: () => ({ reset: mockResetDb }),
  getProjectModel: () => mockProjectModel,
  getMediator: () => mockMediator,
  getTopology: jest.fn(),
}));

import { useGlobalStore } from '@/store/api';
import useSessionCleanup from '../useSessionCleanup';

const SESSION = {
  loggedUser: 'test-user',
  accessLevel: 4,
  isReadOnly: false,
  guiServerHost: 'host-a',
  guiServerPort: 44444,
  guiServerTopic: 'TOPIC_A',
  guiServerVersion: '2.20.0',
  sessionStartEpoc: 1700000000000,
};

function login(session: typeof SESSION = SESSION) {
  act(() => {
    useGlobalStore.getState().setLoggedIn(session);
  });
}

describe('useSessionCleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectModel.clearRoot();
    act(() => {
      useGlobalStore.getState().reset();
    });
    mockPanelWrangler = new PanelWrangler();
    mockResetWorkspace = jest.spyOn(mockPanelWrangler, 'resetWorkspace');
  });

  afterEach(() => {
    mockPanelWrangler.dispose();
  });

  it('does not clear when the app starts without a session', () => {
    renderHook(() => useSessionCleanup());

    expect(mockResetWorkspace).not.toHaveBeenCalled();
    expect(mockResetDb).not.toHaveBeenCalled();
  });

  it('does not clear while the session stays active', () => {
    login();
    const project = new ProjectModel({ uuid: 'root' });
    mockProjectModel.setRoot('CONTROLS', project);
    const { rerender } = renderHook(() => useSessionCleanup());

    rerender();

    expect(mockResetWorkspace).not.toHaveBeenCalled();
    expect(mockResetDb).not.toHaveBeenCalled();
    expect(mockProjectModel.root).toBe(project);
    expect(mockProjectModel.domain).toBe('CONTROLS');
  });

  it('keeps cinema failures active until the session actually ends', () => {
    login();
    mockPanelWrangler.dispose();
    mockPanelWrangler = new PanelWrangler(createWorkspacePolicy('cinema'));
    mockResetWorkspace = jest.spyOn(mockPanelWrangler, 'resetWorkspace');
    renderHook(() => useSessionCleanup());

    act(() => {
      useGlobalStore.getState().setCinemaError('Scene missing');
      useGlobalStore.getState().setNotifiedSessionExpiration(30);
    });

    expect(mockResetWorkspace).not.toHaveBeenCalled();
    expect(mockResetDb).not.toHaveBeenCalled();
    expect(useGlobalStore.getState().sessionInfo).toEqual(SESSION);
    expect(useGlobalStore.getState().globalState).toBe('CINEMA_ERROR');

    act(() => useGlobalStore.getState().setSessionExpired());

    expect(mockResetWorkspace).toHaveBeenCalledTimes(1);
    expect(mockResetDb).toHaveBeenCalledTimes(1);
    expect(mockPanelWrangler.getSnapshot().center.activeTabId).toBe(
      CINEMA_TAB_ID
    );
  });

  it('clears the workspace and project when the user logs out', () => {
    login();
    const scene = new SceneModel({
      uuid: 'session-scene',
      simple_name: 'Session scene',
      width: 800,
      height: 600,
      initialized: true,
    });
    const project = new ProjectModel({ uuid: 'root' });
    project.initialized = true;
    project.scenes = [scene];
    mockProjectModel.setRoot('CONTROLS', project);
    broadcast_event(KaraboEvent.OpenScene, { model: scene });
    const registry = mockPanelWrangler.getContent(
      'scene:session-scene'
    )!.sceneControllerRegistry!;
    const dispose = jest.spyOn(registry, 'dispose');
    const controller = new DisplayTextLogModel();
    controller.keys = ['DEV.value'];
    mockPanelWrangler.openControllerPanel(controller);
    renderHook(() => useSessionCleanup());

    act(() => {
      useGlobalStore.getState().setLoggedOut();
    });

    expect(mockResetWorkspace).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(mockPanelWrangler.getSnapshot().right.controllerPanels).toEqual([]);
    expect(mockPanelWrangler.getSnapshot().center.activeTabId).toBe('home');
    expect(mockPanelWrangler.getContent('scene:session-scene')).toBeUndefined();
    expect(mockResetDb).toHaveBeenCalledTimes(1);
    expect(mockProjectModel.root).toBeUndefined();
    expect(mockProjectModel.domain).toBeUndefined();
  });

  // The reason this is keyed on sessionInfo rather than on the logout handler:
  // expiry and connection failure end a session without going near that button.
  it('clears the workspace and project when the session expires', () => {
    login();
    mockProjectModel.setRoot('CONTROLS', new ProjectModel({ uuid: 'root' }));
    renderHook(() => useSessionCleanup());

    act(() => {
      useGlobalStore.getState().setSessionExpired();
    });

    expect(mockResetWorkspace).toHaveBeenCalledTimes(1);
    expect(mockResetDb).toHaveBeenCalledTimes(1);
    expect(mockProjectModel.root).toBeUndefined();
    expect(mockProjectModel.domain).toBeUndefined();
  });

  it('clears the workspace and project when the connection drops', () => {
    login();
    mockProjectModel.setRoot('CONTROLS', new ProjectModel({ uuid: 'root' }));
    renderHook(() => useSessionCleanup());

    act(() => {
      useGlobalStore.getState().setError('No connection to GUI server');
    });

    expect(mockResetWorkspace).toHaveBeenCalledTimes(1);
    expect(mockResetDb).toHaveBeenCalledTimes(1);
    expect(mockProjectModel.root).toBeUndefined();
    expect(mockProjectModel.domain).toBeUndefined();
  });

  it('clears each separate session after logging out and back in', () => {
    login();
    renderHook(() => useSessionCleanup());

    act(() => {
      useGlobalStore.getState().setLoggedOut();
    });
    login({
      ...SESSION,
      guiServerHost: 'host-b',
      guiServerTopic: 'TOPIC_B',
      sessionStartEpoc: 1700000100000,
    });
    act(() => {
      useGlobalStore.getState().setLoggedOut();
    });

    expect(mockResetWorkspace).toHaveBeenCalledTimes(2);
  });
});
