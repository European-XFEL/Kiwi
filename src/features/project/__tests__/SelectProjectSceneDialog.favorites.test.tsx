import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Hash, HashList } from '@/karabo/data/api';
import { KaraboEvent } from '@/lib/events';
import type { StoredProjectFavorite } from '@/lib/singletons/api';
import { ConfigurationStore } from '@/lib/singletons/Configuration';
import { Mediator } from '@/lib/singletons/Mediator';
import { useGlobalStore } from '@/store/api';
import { SingletonContext } from '@/testing';
import SelectProjectSceneDialog from '../SelectProjectSceneDialog';

jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));

describe('Load Project favorites', () => {
  let context: SingletonContext;
  let config: ConfigurationStore;
  let mediator: Mediator;
  const listProjects = jest.fn();
  const loadProject = jest.fn();
  const onListScenes = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    config = new ConfigurationStore();
    config.currentDomain = 'CONTROLS';
    mediator = new Mediator();
    context = new SingletonContext({
      config,
      mediator,
      db_conn: { listDomains: jest.fn(), listProjects, loadProject },
      network: { onListScenes },
    });
    useGlobalStore.getState().setLoggedIn({
      loggedUser: 'test-user',
      accessLevel: 0,
      isReadOnly: true,
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
    context.restore();
    localStorage.clear();
  });

  function showScenes(secondUuid = 'scene-b') {
    act(() => {
      mediator.postEvent(
        KaraboEvent.ListDomains,
        new Hash({
          reason: '',
          reply: new Hash({ domains: ['CONTROLS'] }),
        })
      );
    });
    act(() => {
      mediator.postEvent(
        KaraboEvent.ListProjects,
        new Hash({
          reason: '',
          'reply.items': new HashList([
            new Hash({
              uuid: 'motors',
              simple_name: 'Motors',
              date: '2026-07-01T00:00:00',
              is_trashed: false,
            }),
          ]),
        })
      );
    });
    act(() => {
      mediator.postEvent(
        KaraboEvent.ListScenes,
        new Hash({
          reason: '',
          'reply.items': new HashList([
            new Hash({
              uuid: 'scene-a',
              simple_name: 'First Scene',
              date: '2026-07-01T00:00:00',
            }),
            new Hash({
              uuid: secondUuid,
              simple_name: 'Second Scene',
              date: '2026-07-01T00:00:00',
            }),
          ]),
        })
      );
    });
  }

  it('saves the context-menu scene with complete metadata and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const changes: {
      topic: string;
      favorites: readonly StoredProjectFavorite[];
    }[] = [];
    mediator.on(KaraboEvent.ProjectFavoritesChanged, (data: Hash) => {
      const topic = data.getValue<string>('topic');
      changes.push({
        topic,
        favorites: new ConfigurationStore().getProjectFavorites(topic),
      });
    });
    const onSceneSelected = jest.fn();
    const onCancel = jest.fn();
    render(
      <SelectProjectSceneDialog
        open
        onSceneSelected={onSceneSelected}
        onCancel={onCancel}
      />
    );
    showScenes();
    const requestsBefore = listProjects.mock.calls.length;

    fireEvent.contextMenu(screen.getByTestId('scene-row-scene-b'));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Add to Favorites' })
    );

    const restored = new ConfigurationStore();
    expect(restored.getProjectFavorites('TOPIC_A')).toEqual([
      {
        domain: 'CONTROLS',
        projectUuid: 'motors',
        projectName: 'Motors',
        sceneUuid: 'scene-b',
        sceneName: 'Second Scene',
      },
    ]);
    expect(restored.getProjectFavorites('CONTROLS')).toEqual([]);
    expect(changes).toEqual([
      {
        topic: 'TOPIC_A',
        favorites: [
          {
            domain: 'CONTROLS',
            projectUuid: 'motors',
            projectName: 'Motors',
            sceneUuid: 'scene-b',
            sceneName: 'Second Scene',
          },
        ],
      },
    ]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onSceneSelected).not.toHaveBeenCalled();
    expect(loadProject).not.toHaveBeenCalled();
    expect(listProjects).toHaveBeenCalledTimes(requestsBefore);
  });

  it('cannot bookmark without a current session topic', async () => {
    const user = userEvent.setup();
    useGlobalStore.getState().reset();
    render(
      <SelectProjectSceneDialog
        open
        onSceneSelected={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    showScenes();

    fireEvent.contextMenu(screen.getByTestId('scene-row-scene-b'));
    const item = screen.queryByRole('menuitem', { name: 'Add to Favorites' });
    if (item) {
      expect(item).toHaveAttribute('aria-disabled', 'true');
      await user.click(item);
    }
    expect(config.getProjectFavorites('TOPIC_A')).toEqual([]);
    expect(
      localStorage.getItem('kiwi/project:projectFavoritesByTopic')
    ).toBeNull();
  });

  it.each(['right click', 'ContextMenu', 'Shift+F10'])(
    'copies the unselected row through %s and leaves the dialog open',
    async (access) => {
      const user = userEvent.setup();
      const writeText = jest
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue();
      const onSceneSelected = jest.fn();
      const onCancel = jest.fn();
      render(
        <SelectProjectSceneDialog
          open
          onSceneSelected={onSceneSelected}
          onCancel={onCancel}
        />
      );
      showScenes('scene/+?&');
      await user.click(screen.getByText('First Scene'));
      const target = screen.getByRole('button', { name: /^Second Scene/ });
      target.focus();
      if (access === 'right click') fireEvent.contextMenu(target);
      else
        fireEvent.keyDown(target, {
          key: access === 'ContextMenu' ? 'ContextMenu' : 'F10',
          shiftKey: access === 'Shift+F10',
        });
      const requestsBefore = listProjects.mock.calls.length;
      await user.click(
        await screen.findByRole('menuitem', {
          name: 'Copy cinema URL',
        })
      );
      expect(writeText).toHaveBeenCalledTimes(1);
      const url = new URL(writeText.mock.calls[0][0]);
      expect(url.origin).toBe(window.location.origin);
      expect(url.pathname).toBe('/cinema');
      expect(Array.from(url.searchParams)).toEqual([
        ['scene_uuid', 'scene/+?&'],
        ['host', 'host-a'],
        ['port', '44444'],
      ]);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onSceneSelected).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      expect(loadProject).not.toHaveBeenCalled();
      expect(listProjects).toHaveBeenCalledTimes(requestsBefore);
    }
  );

  it.each(['unavailable', 'rejected'])(
    'shows an error when clipboard access is %s',
    async (failure) => {
      const user = userEvent.setup();
      if (failure === 'unavailable')
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: undefined,
        });
      else
        jest
          .spyOn(navigator.clipboard, 'writeText')
          .mockRejectedValue(new Error('Permission denied'));
      const onSceneSelected = jest.fn();
      render(
        <SelectProjectSceneDialog
          open
          onSceneSelected={onSceneSelected}
          onCancel={jest.fn()}
        />
      );
      showScenes();
      fireEvent.contextMenu(screen.getByTestId('scene-row-scene-b'));
      await user.click(
        await screen.findByRole('menuitem', {
          name: 'Copy cinema URL',
        })
      );
      expect(
        await screen.findByText(/Could not copy cinema URL:/)
      ).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onSceneSelected).not.toHaveBeenCalled();
      expect(loadProject).not.toHaveBeenCalled();
    }
  );

  it('disables copying without a GUI-server session', async () => {
    const user = userEvent.setup();
    const writeText = jest.spyOn(navigator.clipboard, 'writeText');
    useGlobalStore.getState().reset();
    render(
      <SelectProjectSceneDialog
        open
        onSceneSelected={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    showScenes();
    fireEvent.contextMenu(screen.getByTestId('scene-row-scene-b'));
    const item = await screen.findByRole('menuitem', {
      name: 'Copy cinema URL',
    });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    await user.click(item);
    expect(writeText).not.toHaveBeenCalled();
  });
});
