import { act, renderHook } from '@testing-library/react';
import { ProjectModel } from '@/karabo/common/project/api';
import { Mediator } from '@/lib/singletons/Mediator';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';

const mockResetWorkspace = jest.fn();
const mockProjectModel = new ProjectItemModel();
const mockMediator = new Mediator();

jest.mock('@/lib/singletons/api', () => ({
  getPanelWrangler: () => ({ resetWorkspace: mockResetWorkspace }),
  getDbConn: jest.fn(),
  getProjectModel: () => mockProjectModel,
  getMediator: () => mockMediator,
  getTopology: jest.fn(),
}));

import { useActiveSceneStore } from '@/features/scene-view/hooks/useActiveScene';
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
    useActiveSceneStore.setState({
      loadedSceneRef: undefined,
      sceneLoadPending: false,
    });
  });

  it('does not clear when the app starts without a session', () => {
    renderHook(() => useSessionCleanup());

    expect(mockResetWorkspace).not.toHaveBeenCalled();
  });

  it('does not clear while the session stays active', () => {
    login();
    const project = new ProjectModel({ uuid: 'root' });
    mockProjectModel.setRoot('CONTROLS', project);
    const { rerender } = renderHook(() => useSessionCleanup());

    rerender();

    expect(mockResetWorkspace).not.toHaveBeenCalled();
    expect(mockProjectModel.root).toBe(project);
    expect(mockProjectModel.domain).toBe('CONTROLS');
  });

  it('clears the workspace and project when the user logs out', () => {
    login();
    mockProjectModel.setRoot('CONTROLS', new ProjectModel({ uuid: 'root' }));
    renderHook(() => useSessionCleanup());

    act(() => {
      useGlobalStore.getState().setLoggedOut();
    });

    expect(mockResetWorkspace).toHaveBeenCalledTimes(1);
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
    expect(mockProjectModel.root).toBeUndefined();
    expect(mockProjectModel.domain).toBeUndefined();
  });

  it('clears the active scene state when the user logs out', () => {
    login();
    act(() => {
      useActiveSceneStore.setState({
        loadedSceneRef: {
          uuid: 'scene-a',
          domain: 'CONTROLS',
          projectUuid: 'project-a',
          projectName: 'ProjectA',
          name: 'Scene A',
          width: 800,
          height: 600,
        },
        sceneLoadPending: true,
      });
    });
    renderHook(() => useSessionCleanup());

    act(() => {
      useGlobalStore.getState().setLoggedOut();
    });

    expect(useActiveSceneStore.getState().loadedSceneRef).toBeUndefined();
    expect(useActiveSceneStore.getState().sceneLoadPending).toBe(false);
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
