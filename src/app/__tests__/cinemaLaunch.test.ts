import { useApplicationModeStore } from '@/store/api';
import { CINEMA_LAUNCH_KEY } from '@/features/cinema/api';
import { initializeApplicationMode } from '../initializeApplicationMode';

beforeEach(() => {
  sessionStorage.clear();
  useApplicationModeStore.setState({ mode: 'normal' }, true);
});

afterEach(() => {
  window.history.replaceState(null, '', '/main');
  useApplicationModeStore.setState({ mode: 'normal' }, true);
  sessionStorage.clear();
});

it('removes actual browser parameters before startup and recovers the launch on refresh', () => {
  window.history.replaceState(
    null,
    '',
    '/cinema?scene_uuid=first&scene_uuid=second&host=gui&port=44444'
  );
  initializeApplicationMode();
  expect(window.location.pathname).toBe('/cinema');
  expect(window.location.search).toBe('');
  expect(useApplicationModeStore.getState()).toEqual({
    mode: 'cinema',
    launch: { sceneUuids: ['first', 'second'], host: 'gui', port: 44444 },
  });
  const original = useApplicationModeStore.getState();
  initializeApplicationMode();
  expect(useApplicationModeStore.getState()).toEqual(original);
});

it.each([
  '?host=gui&port=1234',
  '?scene_uuid=',
  '?scene_uuid=a&scene_uuid=',
  '?scene_uuid=a&host=gui',
  '?scene_uuid=a&port=1',
  '?scene_uuid=a&port=12abc&host=gui',
  '?scene_uuid=a&host=gui&port=0',
  '?scene_uuid=a&host=gui&port=65536',
  '?scene_uuid=a&host=https://gui&port=1234',
  '?scene_uuid=a&host=gui:1234&port=1234',
  '?scene_uuid=a&host=[broken]&port=1234',
  '?scene_uuid=a&host=gui&host=other&port=1234',
  '?scene_uuid=a&unexpected=1',
])(
  'rejects an invalid bookmark without reopening a previous launch: %s',
  (query) => {
    sessionStorage.setItem(
      CINEMA_LAUNCH_KEY,
      JSON.stringify({ sceneUuids: ['original'] })
    );
    window.history.replaceState(null, '', `/cinema${query}`);
    initializeApplicationMode();
    expect(window.location.search).toBe('');
    expect(useApplicationModeStore.getState().launch).toBeUndefined();
    expect(useApplicationModeStore.getState().launchError).toBeTruthy();
    expect(sessionStorage.getItem(CINEMA_LAUNCH_KEY)).toBeNull();
  }
);

it('replaces the saved launch when opening another bookmark', () => {
  sessionStorage.setItem(
    CINEMA_LAUNCH_KEY,
    JSON.stringify({ sceneUuids: ['original'], host: 'old-host', port: 1 })
  );
  window.history.replaceState(null, '', '/cinema?scene_uuid=new');
  initializeApplicationMode();
  initializeApplicationMode();
  expect(useApplicationModeStore.getState().launch).toEqual({
    sceneUuids: ['new'],
  });
});

it('reports corrupt stored bookmarks without starting a launch', () => {
  sessionStorage.setItem(CINEMA_LAUNCH_KEY, '{oops');
  window.history.replaceState(null, '', '/cinema');
  initializeApplicationMode();
  expect(useApplicationModeStore.getState().launch).toBeUndefined();
  expect(useApplicationModeStore.getState().launchError).toBeTruthy();
});

it.each(['/', '/main'])(
  'defaults to normal mode on %s without using stored cinema bookmarks',
  (pathname) => {
    const launch = { sceneUuids: ['original'] };
    sessionStorage.setItem(CINEMA_LAUNCH_KEY, JSON.stringify(launch));
    useApplicationModeStore.setState(
      { mode: 'cinema', launch, launchError: 'Previous failure' },
      true
    );
    window.history.replaceState(null, '', pathname);

    initializeApplicationMode();

    expect(useApplicationModeStore.getState()).toEqual({ mode: 'normal' });
    expect(window.location.pathname).toBe(pathname);
    expect(window.location.search).toBe('');
    expect(JSON.parse(sessionStorage.getItem(CINEMA_LAUNCH_KEY)!)).toEqual(
      launch
    );
  }
);
