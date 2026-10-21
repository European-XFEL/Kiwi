import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'sonner';
import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { singletons } from '@/lib/singletons/api';
import { Mediator } from '@/lib/singletons/Mediator';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';
import { ConfigurationStore } from '@/lib/singletons/Configuration';
import {
  ProjectFavoritesList,
  useProjectFavorites,
} from '@/features/project/api';
import { useGlobalStore } from '@/store/api';
import { SingletonContext } from '@/testing';
import ProjectPanel from '../ProjectPanel';

let context: SingletonContext;
let model: ProjectItemModel;
let wrangler: PanelWrangler;
let config: ConfigurationStore;

beforeEach(() => {
  localStorage.clear();
  config = new ConfigurationStore();
  jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
  jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
  useGlobalStore.getState().setLoggedIn({
    loggedUser: 'test',
    accessLevel: 0,
    isReadOnly: true,
    guiServerHost: 'host-a',
    guiServerPort: 44444,
    guiServerTopic: 'TOPIC_A',
    guiServerVersion: '2.20.0',
    sessionStartEpoc: 1,
  });
  model = new ProjectItemModel();
  context = new SingletonContext({
    config,
    mediator: new Mediator(),
    project_model: model,
    panel_wrangler: undefined,
  });
  wrangler = new PanelWrangler();
  singletons.set('panel_wrangler', wrangler);
  const root = new ProjectModel({ uuid: 'root', simple_name: 'Experiment' });
  root.initialized = true;
  root.scenes = [
    new SceneModel({
      uuid: 'overview',
      simple_name: 'Overview',
      initialized: true,
    }),
  ];
  const child = new ProjectModel({ uuid: 'child', simple_name: 'Motors' });
  child.initialized = true;
  child.scenes = [
    new SceneModel({
      uuid: 'scene/+?&',
      simple_name: 'Child scene',
      initialized: true,
    }),
  ];
  root.subprojects = [child];
  model.setRoot('CONTROLS', root);
});

afterEach(() => {
  cleanup();
  wrangler.dispose();
  context.restore();
  useGlobalStore.getState().reset();
  jest.restoreAllMocks();
  localStorage.clear();
});

function row(name: string) {
  return screen.getByText(name).closest('[role="treeitem"]') as HTMLElement;
}

function Favorites() {
  const favorites = useProjectFavorites('TOPIC_A');
  return (
    <ProjectFavoritesList
      favorites={favorites}
      onOpen={() => {}}
      onRemove={() => {}}
      onMove={() => {}}
    />
  );
}

it.each(['Experiment', 'Motors'])(
  'bookmarks project %s without scenes or opening a tab',
  async (name) => {
    model.root!.scenes = [];
    model.root!.subprojects[0].scenes = [];
    const user = userEvent.setup();
    render(
      <>
        <ProjectPanel />
        <Favorites />
      </>
    );
    fireEvent.contextMenu(row(name));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Add to Favorites' })
    );
    expect(config.getProjectFavorites('TOPIC_A')).toEqual([
      {
        domain: 'CONTROLS',
        projectUuid: name === 'Experiment' ? 'root' : 'child',
        projectName: name,
      },
    ]);
    expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual(
      config.getProjectFavorites('TOPIC_A')
    );
    expect(
      screen.getByRole('button', { name: `Open favorite ${name}` })
    ).toBeInTheDocument();
    expect(wrangler.isSceneTabOpen()).toBe(false);
  }
);

it.each(['right click', 'ContextMenu', 'Shift+F10'])(
  'copies the targeted nested scene through %s without opening a scene',
  async (access) => {
    const user = userEvent.setup();
    render(<ProjectPanel />);
    fireEvent.click(row('Overview'));
    fireEvent.doubleClick(row('Motors'));
    const center = wrangler.getSnapshot().center;
    const target = row('Child scene');
    target.focus();
    if (access === 'right click') {
      fireEvent.contextMenu(target);
    } else {
      fireEvent.keyDown(target, {
        key: access === 'ContextMenu' ? 'ContextMenu' : 'F10',
        shiftKey: access === 'Shift+F10',
      });
    }
    const item = await screen.findByRole('menuitem', {
      name: 'Copy cinema URL',
    });
    if (access === 'right click') {
      await user.click(item);
    } else {
      item.focus();
      await user.keyboard('{Enter}');
    }
    const copied = new URL(await navigator.clipboard.readText());
    expect(copied.origin).toBe(window.location.origin);
    expect(copied.pathname).toBe('/cinema');
    expect(Object.fromEntries(copied.searchParams)).toEqual({
      scene_uuid: 'scene/+?&',
      host: 'host-a',
      port: '44444',
    });
    expect(wrangler.getSnapshot().center).toBe(center);
    expect(model.root?.uuid).toBe('root');
  }
);

it('disables copying when the GUI server connection is lost while the menu is open', async () => {
  userEvent.setup();
  render(<ProjectPanel />);
  fireEvent.contextMenu(row('Overview'));
  const item = await screen.findByRole('menuitem', { name: 'Copy cinema URL' });
  act(() => useGlobalStore.getState().setSessionExpired());
  expect(item).toHaveAttribute('aria-disabled', 'true');
  expect(
    screen.queryByRole('menuitem', { name: 'Add to Favorites' })
  ).not.toBeInTheDocument();
  fireEvent.click(item);
  expect(await navigator.clipboard.readText()).toBe('');
  expect(wrangler.getSnapshot().center.tabs).toHaveLength(0);
});

it.each(['unavailable', 'rejected'])(
  'reports %s clipboard access without opening a scene',
  async (access) => {
    const user = userEvent.setup();
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'clipboard'
    )!;
    if (access === 'unavailable') {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
    } else {
      jest
        .spyOn(navigator.clipboard, 'writeText')
        .mockRejectedValue(new Error('Permission denied'));
    }
    try {
      render(
        <>
          <ProjectPanel />
          <Toaster />
        </>
      );
      fireEvent.contextMenu(row('Overview'));
      await user.click(
        await screen.findByRole('menuitem', { name: 'Copy cinema URL' })
      );
      const reason =
        access === 'unavailable'
          ? /Clipboard access is unavailable/
          : /Permission denied/;
      expect(await screen.findByText(reason)).toBeInTheDocument();
      expect(wrangler.getSnapshot().center.tabs).toHaveLength(0);
    } finally {
      Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    }
  }
);

it('does not offer a cinema URL for projects or groups', () => {
  render(<ProjectPanel />);
  for (const name of ['Experiment', 'Scenes', 'Subprojects', 'Motors']) {
    fireEvent.contextMenu(row(name));
    expect(
      screen.queryByRole('menuitem', { name: 'Copy cinema URL' })
    ).toBeNull();
  }
});

it('disables bookmarking when the session expires with the project menu open', async () => {
  render(<ProjectPanel />);
  fireEvent.contextMenu(row('Motors'));
  const item = await screen.findByRole('menuitem', {
    name: 'Add to Favorites',
  });
  act(() => useGlobalStore.getState().setSessionExpired());
  expect(item).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(item);
  expect(config.getProjectFavorites('TOPIC_A')).toEqual([]);
});
