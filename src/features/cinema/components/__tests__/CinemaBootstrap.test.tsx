import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import AppBody from '@/app/AppBody';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useApplicationModeStore, useGlobalStore } from '@/store/api';
import { CINEMA_TAB_ID } from '../../const';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { SingletonContext } from '@/testing';
import { showMessageBox } from '@/lib/messagebox';
import CinemaBootstrap from '../CinemaBootstrap';
import { createWorkspacePolicy } from '@/features/workspace/configuration';
import { openSceneLinkInWorkspace } from '@/features/project/utils/openSceneLinkInWorkspace';

jest.mock('@/lib/messagebox', () => ({ showMessageBox: jest.fn() }));

const getDatabaseScene = jest.fn();
let wrangler: PanelWrangler;
let context: SingletonContext;
let topology: { initialized: boolean };

function scene(uuid: string, name = uuid) {
  return new SceneModel({ uuid, simple_name: name, initialized: true });
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  useApplicationModeStore.setState(
    { mode: 'cinema', launch: { sceneUuids: ['first', 'second'] } },
    true
  );
  useGlobalStore.getState().setLoggedIn({
    loggedUser: 'user',
    accessLevel: 0,
    isReadOnly: true,
    guiServerHost: 'gui',
    guiServerPort: 44444,
    guiServerTopic: 'TOPIC',
    guiServerVersion: '2.20',
    sessionStartEpoc: 1,
  });
  topology = { initialized: true };
  wrangler = new PanelWrangler(createWorkspacePolicy('cinema'));
  context = new SingletonContext({
    panel_wrangler: wrangler,
    topology,
    db_conn: { getDatabaseScene },
  });
  getDatabaseScene.mockImplementation(async (uuid: string) => scene(uuid));
});

afterEach(() => {
  cleanup();
  wrangler.dispose();
  context.restore();
  useGlobalStore.getState().reset();
  useApplicationModeStore.setState({ mode: 'normal' }, true);
  jest.useRealTimers();
});

it('opens the bookmark in order with separate UUID tabs and reuses them through scene links', async () => {
  getDatabaseScene.mockImplementation(async (uuid: string) =>
    scene(uuid, 'Overview')
  );
  render(
    <StrictMode>
      <CinemaBootstrap />
    </StrictMode>
  );
  await waitFor(() =>
    expect(wrangler.getSnapshot().center.tabs).toHaveLength(2)
  );
  expect(getDatabaseScene.mock.calls).toEqual([['first'], ['second']]);
  expect(wrangler.getSnapshot().center.tabs.map((tab) => tab.id)).toEqual([
    'database-scene:first',
    'database-scene:second',
  ]);
  expect(wrangler.getContent('database-scene:first')?.sceneModel?.uuid).toBe(
    'first'
  );
  expect(wrangler.getContent('database-scene:second')?.sceneModel?.uuid).toBe(
    'second'
  );
  expect(wrangler.getSnapshot().center.activeTabId).toBe(
    'database-scene:first'
  );
  expect(wrangler.getSceneTab('database-scene:first')?.isUnattachedScene).toBe(
    true
  );

  await act(async () => openSceneLinkInWorkspace('first', 'Renamed overview'));
  expect(wrangler.getSnapshot().center.tabs.map((tab) => tab.id)).toEqual([
    'database-scene:first',
    'database-scene:second',
  ]);
  expect(
    wrangler.getContent('database-scene:first')?.sceneModel?.simple_name
  ).toContain('Renamed overview');
});

it('waits for topology before retrieving scenes', async () => {
  jest.useFakeTimers();
  topology.initialized = false;
  render(<CinemaBootstrap />);
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  expect(getDatabaseScene).not.toHaveBeenCalled();
  topology.initialized = true;
  await act(async () => {
    jest.advanceTimersByTime(100);
  });
  expect(getDatabaseScene.mock.calls).toEqual([['first'], ['second']]);
});

it('stops waiting when cleaned up before topology becomes ready', async () => {
  jest.useFakeTimers();
  topology.initialized = false;
  const { unmount } = render(<CinemaBootstrap />);
  unmount();
  topology.initialized = true;
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  expect(getDatabaseScene).not.toHaveBeenCalled();
});

it('preserves successful scenes and reports a failed scene UUID', async () => {
  useApplicationModeStore.setState({
    launch: { sceneUuids: ['missing', 'first', 'broken', 'second'] },
  });
  getDatabaseScene.mockImplementation(async (uuid: string) => {
    if (uuid === 'missing') {
      return undefined;
    }
    if (uuid === 'broken') {
      throw new Error('Database unavailable');
    }
    return scene(uuid);
  });
  render(
    <StrictMode>
      <CinemaBootstrap />
    </StrictMode>
  );
  await waitFor(() =>
    expect(wrangler.getSnapshot().center.tabs).toHaveLength(2)
  );
  expect(wrangler.getSnapshot().center.activeTabId).toBe(
    'database-scene:first'
  );
  expect(showMessageBox).toHaveBeenCalledTimes(1);
  expect(showMessageBox).toHaveBeenCalledWith({
    variant: 'error',
    title: 'Cinema scene errors',
    msg: 'Some scenes could not be opened. Successfully loaded scenes remain available.',
    details:
      'Scene missing: The scene was not found.\nScene broken: Database unavailable',
  });
  expect(useGlobalStore.getState().globalState).toBe('LOGGED_IN');
});

it('shows the failed UUIDs without ending the session when every scene fails', async () => {
  getDatabaseScene.mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <CinemaBootstrap />
      <AppBody />
    </MemoryRouter>
  );
  await waitFor(() =>
    expect(useGlobalStore.getState().globalState).toBe('CINEMA_ERROR')
  );
  expect(useGlobalStore.getState().lastGlobalError).toBe(
    'Scene first: The scene was not found.\nScene second: The scene was not found.'
  );
  expect(useGlobalStore.getState().sessionInfo).toMatchObject({
    sessionStartEpoc: 1,
  });
  expect(showMessageBox).not.toHaveBeenCalled();
  expect(wrangler.getSnapshot().center.activeTabId).toBe(CINEMA_TAB_ID);
  expect(wrangler.isSceneTabOpen()).toBe(false);
  expect(screen.getByRole('alert')).toHaveTextContent('Scene first:');
  expect(screen.getByRole('alert')).toHaveTextContent('Scene second:');
  expect(
    screen.queryByRole('button', { name: /home/i })
  ).not.toBeInTheDocument();
  act(() => useGlobalStore.getState().setNotifiedSessionExpiration(30));
  expect(screen.getByRole('alert')).toHaveTextContent('Cinema error');
});

it.each([
  ['unmount', 'success'],
  ['logout', 'rejection'],
  ['new session', 'success'],
])('ignores stale scene replies after %s: %s', async (end, reply) => {
  let resolve!: (model: SceneModel | undefined) => void;
  let reject!: (error: Error) => void;
  getDatabaseScene.mockImplementation(
    () =>
      new Promise<SceneModel | undefined>((done, fail) => {
        resolve = done;
        reject = fail;
      })
  );
  const { unmount } = render(<CinemaBootstrap />);
  await waitFor(() => expect(getDatabaseScene).toHaveBeenCalledTimes(1));
  const resolveStale = resolve;
  const rejectStale = reject;
  if (end === 'unmount') {
    unmount();
  } else {
    act(() => {
      if (end === 'logout') {
        useGlobalStore.getState().setLoggedOut();
      } else {
        useGlobalStore.getState().setLoggedIn({
          ...useGlobalStore.getState().sessionInfo!,
          sessionStartEpoc: 2,
        });
      }
    });
  }
  await act(async () => {
    if (reply === 'rejection') {
      rejectStale(new Error('Stale database failure'));
    } else {
      resolveStale(scene('stale'));
    }
  });
  expect(wrangler.getSnapshot().center.activeTabId).toBe(CINEMA_TAB_ID);
  expect(showMessageBox).not.toHaveBeenCalled();
  expect(useGlobalStore.getState().globalState).not.toBe('CINEMA_ERROR');
});

it('does not restart when access level changes during retrieval', async () => {
  let resolve!: (model: SceneModel) => void;
  getDatabaseScene.mockImplementationOnce(
    () =>
      new Promise<SceneModel>((done) => {
        resolve = done;
      })
  );
  render(<CinemaBootstrap />);
  await waitFor(() => expect(getDatabaseScene).toHaveBeenCalledTimes(1));
  act(() => useGlobalStore.getState().updateAccessLevel(1));
  await act(async () => resolve(scene('first')));
  expect(getDatabaseScene.mock.calls).toEqual([['first'], ['second']]);
  expect(wrangler.getSnapshot().center.tabs).toHaveLength(2);
});
