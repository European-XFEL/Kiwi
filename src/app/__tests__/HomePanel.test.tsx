import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Hash } from '@/karabo/data/api';
import { KaraboEvent } from '@/lib/events';
import { getConfig, getMediator, singletons } from '@/lib/singletons/api';
import { ConfigurationStore } from '@/lib/singletons/Configuration';
import { useGlobalStore } from '@/store/api';
import {
  addProjectFavorite,
  removeProjectFavorite,
  loadRootProjectScene,
} from '@/features/project/api';
import HomePanel from '../HomePanel';

jest.mock('@/features/project/utils/rootProjectActions', () => ({
  loadRootProjectScene: jest.fn(),
}));

const favorite = {
  domain: 'CONTROLS',
  projectUuid: 'motors',
  projectName: 'Motors',
  sceneUuid: 'motor-scene',
  sceneName: 'Motor Scene',
};

describe('HomePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    singletons.delete('config');
    singletons.delete('mediator');
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
    cleanup();
    useGlobalStore.getState().reset();
    singletons.delete('config');
    singletons.delete('mediator');
    localStorage.clear();
  });

  it('does not offer recent scenes saved by an earlier version', () => {
    localStorage.setItem(
      'kiwi/project:recentScenesByTopic',
      JSON.stringify({
        TOPIC_A: [
          {
            domain: 'CONTROLS',
            projectUuid: 'motor-project',
            projectName: 'Motors',
            uuid: 'motor-scene',
            name: 'Motor Scene',
          },
        ],
      })
    );

    render(<HomePanel />);

    expect(screen.getByRole('heading', { name: 'Kiwi' })).toBeInTheDocument();
    expect(screen.queryByText('Recent Scenes')).not.toBeInTheDocument();
    expect(screen.queryByText('Motor Scene')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open scene' })
    ).not.toBeInTheDocument();
  });

  it('shows instructions when no scenes have been bookmarked', () => {
    render(<HomePanel />);
    expect(
      screen.getByRole('heading', { name: 'Project Favorites' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Load Project.*Add to Favorites/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Open favorite/ })
    ).not.toBeInTheDocument();
  });

  it('owns vertical scrolling so long favorites lists remain reachable in the clipped workspace tab', () => {
    for (let index = 0; index < 40; index++) {
      getConfig().addProjectFavorite('TOPIC_A', {
        ...favorite,
        sceneUuid: `scene-${index}`,
        sceneName: `Scene ${index}`,
      });
    }
    render(<HomePanel />);

    // jsdom cannot measure layout. This guards Home's scroll ownership; its
    // workspace tab deliberately uses overflow-hidden for scene rendering.
    expect(screen.getByTestId('home-panel')).toHaveClass(
      'h-full',
      'overflow-y-auto'
    );
    expect(
      screen.getByRole('button', { name: 'Open favorite Scene 0' })
    ).toBeInTheDocument();
  });

  it('shows only favorites for the current topic and follows topic changes', () => {
    getConfig().addProjectFavorite('TOPIC_A', favorite);
    getConfig().addProjectFavorite('TOPIC_B', {
      ...favorite,
      sceneName: 'Other Scene',
    });
    render(<HomePanel />);

    expect(screen.getByText(':Motor Scene')).toBeInTheDocument();
    const projectName = screen.getByText('Motors');
    expect(projectName.tagName).toBe('STRONG');
    expect(projectName.parentElement).toHaveTextContent(/^Motors:Motor Scene$/);
    expect(projectName.parentElement).toHaveClass('truncate', 'text-sm');
    expect(projectName.parentElement).not.toHaveClass('font-medium');
    expect(projectName.parentElement?.parentElement?.children).toHaveLength(1);
    expect(screen.queryByText(/CONTROLS/)).not.toBeInTheDocument();
    expect(screen.queryByText(/TOPIC_[AB]/)).not.toBeInTheDocument();
    expect(screen.queryByText(':Other Scene')).not.toBeInTheDocument();
    act(() => {
      useGlobalStore.getState().setLoggedIn({
        ...useGlobalStore.getState().sessionInfo!,
        guiServerTopic: 'TOPIC_B',
      });
    });
    expect(screen.getByText(':Other Scene')).toBeInTheDocument();
    expect(screen.queryByText(':Motor Scene')).not.toBeInTheDocument();
    act(() =>
      addProjectFavorite('TOPIC_B', {
        ...favorite,
        sceneUuid: 'detail',
        sceneName: 'Detail',
      })
    );
    expect(screen.getByText(':Detail')).toBeInTheDocument();
  });

  it('updates immediately after feature additions and removals', () => {
    render(<HomePanel />);
    act(() => addProjectFavorite('TOPIC_A', favorite));
    expect(screen.getByText(':Motor Scene')).toBeInTheDocument();
    act(() => removeProjectFavorite('TOPIC_A', favorite));
    expect(screen.queryByText(':Motor Scene')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Load Project.*Add to Favorites/)
    ).toBeInTheDocument();
  });

  it('does not refresh after direct Configuration mutations', () => {
    getConfig().addProjectFavorite('TOPIC_A', favorite);
    render(<HomePanel />);

    act(() => getConfig().removeProjectFavorite('TOPIC_A', favorite));
    expect(screen.getByText(':Motor Scene')).toBeInTheDocument();
    act(() =>
      getConfig().addProjectFavorite('TOPIC_A', {
        ...favorite,
        sceneName: 'Renamed Scene',
      })
    );
    expect(screen.getByText(':Motor Scene')).toBeInTheDocument();
    expect(screen.queryByText(':Renamed Scene')).not.toBeInTheDocument();
  });

  it('refreshes after multiple favorite changes in one batch', () => {
    render(<HomePanel />);

    act(() => {
      addProjectFavorite('TOPIC_A', favorite);
      addProjectFavorite('TOPIC_A', {
        ...favorite,
        sceneUuid: 'detail',
        sceneName: 'Detail',
      });
    });

    expect(screen.getByText(':Motor Scene')).toBeInTheDocument();
    expect(screen.getByText(':Detail')).toBeInTheDocument();
  });

  it('ignores other-topic events and reads current Configuration on a matching event', () => {
    getConfig().addProjectFavorite('TOPIC_A', favorite);
    render(<HomePanel />);
    act(() =>
      getConfig().addProjectFavorite('TOPIC_A', {
        ...favorite,
        sceneName: 'Renamed Scene',
      })
    );

    act(() =>
      addProjectFavorite('TOPIC_B', {
        ...favorite,
        sceneName: 'Other Scene',
      })
    );
    expect(screen.getByText(':Motor Scene')).toBeInTheDocument();
    expect(screen.queryByText(':Renamed Scene')).not.toBeInTheDocument();
    expect(screen.queryByText(':Other Scene')).not.toBeInTheDocument();

    act(() =>
      getMediator().postEvent(
        KaraboEvent.ProjectFavoritesChanged,
        new Hash({ topic: 'TOPIC_A' })
      )
    );
    expect(screen.getByText(':Renamed Scene')).toBeInTheDocument();
    expect(screen.queryByText(':Motor Scene')).not.toBeInTheDocument();
  });

  it('reads silent Configuration changes when Home mounts again', () => {
    getConfig().addProjectFavorite('TOPIC_A', favorite);
    const { unmount } = render(<HomePanel />);
    unmount();
    getConfig().addProjectFavorite('TOPIC_A', {
      ...favorite,
      sceneName: 'Renamed Scene',
    });

    render(<HomePanel />);

    expect(screen.getByText(':Renamed Scene')).toBeInTheDocument();
    expect(screen.queryByText(':Motor Scene')).not.toBeInTheDocument();
  });

  it('deletes and persists a favorite immediately', () => {
    getConfig().addProjectFavorite('TOPIC_A', favorite);
    getConfig().addProjectFavorite('TOPIC_B', favorite);
    render(<HomePanel />);
    const changedTopics: string[] = [];
    getMediator().on(KaraboEvent.ProjectFavoritesChanged, (data: Hash) => {
      changedTopics.push(data.get('topic'));
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove favorite Motor Scene' })
    );

    expect(screen.queryByText(':Motor Scene')).not.toBeInTheDocument();
    const restored = new ConfigurationStore();
    expect(restored.getProjectFavorites('TOPIC_A')).toEqual([]);
    expect(restored.getProjectFavorites('TOPIC_B')).toEqual([favorite]);
    expect(changedTopics).toEqual(['TOPIC_A']);
    expect(loadRootProjectScene).not.toHaveBeenCalled();
  });

  it('opens with the stored identifiers and blocks further opens until completion', async () => {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    jest.mocked(loadRootProjectScene).mockReturnValue({
      controller: new AbortController(),
      promise,
      abort: jest.fn(),
    });
    getConfig().addProjectFavorite('TOPIC_A', favorite);
    getConfig().addProjectFavorite('TOPIC_A', {
      ...favorite,
      sceneUuid: 'detail',
      sceneName: 'Detail',
    });
    render(<HomePanel />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Open favorite Motor Scene' })
    );

    expect(loadRootProjectScene).toHaveBeenCalledWith({
      domain: 'CONTROLS',
      projectUuid: 'motors',
      sceneUuid: 'motor-scene',
    });
    expect(
      screen.getByRole('button', { name: 'Open favorite Motor Scene' })
    ).toBeDisabled();
    const otherOpen = screen.getByRole('button', {
      name: 'Open favorite Detail',
    });
    expect(otherOpen).toBeDisabled();
    fireEvent.click(otherOpen);
    expect(loadRootProjectScene).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Remove favorite Detail' })
    ).toBeEnabled();
    await act(async () => {
      resolve();
      await promise;
    });

    await waitFor(() => expect(otherOpen).toBeEnabled());
    expect(
      getConfig()
        .getProjectFavorites('TOPIC_A')
        .map((entry) => entry.sceneUuid)
    ).toEqual(['detail', 'motor-scene']);
  });

  it('allows retrying after an open fails and retains the bookmark', async () => {
    jest.mocked(loadRootProjectScene).mockImplementation(() => ({
      controller: new AbortController(),
      promise: Promise.reject(new Error('Database unavailable')),
      abort: jest.fn(),
    }));
    getConfig().addProjectFavorite('TOPIC_A', favorite);
    render(<HomePanel />);
    const open = screen.getByRole('button', {
      name: 'Open favorite Motor Scene',
    });

    fireEvent.click(open);
    await waitFor(() => expect(open).toBeEnabled());
    fireEvent.click(open);
    await waitFor(() => expect(open).toBeEnabled());

    expect(loadRootProjectScene).toHaveBeenCalledTimes(2);
    expect(getConfig().getProjectFavorites('TOPIC_A')).toEqual([favorite]);
  });
});
