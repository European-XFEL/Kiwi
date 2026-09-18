import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadRootProjectScene } from '@/features/project/api';
import { getConfig, singletons } from '@/lib/singletons/api';
import { useGlobalStore, useRecentStore } from '@/store/api';
import HomePanel from '../HomePanel';

jest.mock('@/features/project/api', () => ({
  RecentScenesList: jest.requireActual(
    '@/features/project/components/RecentScenesList'
  ).default,
  loadRootProjectScene: jest.fn(() => ({
    controller: new AbortController(),
    promise: Promise.resolve(),
    abort: jest.fn(),
  })),
}));

describe('opening persisted recent scenes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    singletons.delete('config');
    useRecentStore.setState({ recentScenes: new Map() });
    useGlobalStore.getState().setLoggedIn({
      loggedUser: 'test-user',
      accessLevel: 4,
      isReadOnly: false,
      guiServerHost: 'host-a',
      guiServerPort: 44444,
      guiServerTopic: 'TOPIC_A',
      guiServerVersion: '2.20.0',
      sessionStartEpoc: 1700000000000,
    });
  });

  afterEach(() => {
    useGlobalStore.getState().reset();
    useRecentStore.setState({ recentScenes: new Map() });
    singletons.delete('config');
    localStorage.clear();
  });

  it.each([undefined, 'experiment-root'])(
    'opens the owning project after restoring an entry with obsolete root %s',
    async (rootProjectUuid) => {
      const user = userEvent.setup();
      const savedScene = {
        domain: 'CONTROLS',
        projectUuid: 'motor-project',
        rootProjectUuid,
        projectName: 'Motors',
        uuid: 'motor-scene',
        name: 'Motor Scene',
      };
      getConfig().setRecentScene('TOPIC_A', savedScene);
      useRecentStore.setState({ recentScenes: new Map() });
      singletons.delete('config');

      render(<HomePanel />);
      await user.click(screen.getByRole('button', { name: 'Open scene' }));

      await waitFor(() =>
        expect(loadRootProjectScene).toHaveBeenCalledWith({
          domain: 'CONTROLS',
          projectUuid: 'motor-project',
          sceneUuid: 'motor-scene',
        })
      );
    }
  );
});
