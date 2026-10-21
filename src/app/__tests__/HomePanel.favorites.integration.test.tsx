import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Hash, HashList } from '@/karabo/data/api';
import { KaraboEvent } from '@/lib/events';
import { showMessageBox } from '@/lib/messagebox';
import { ConfigurationStore } from '@/lib/singletons/Configuration';
import { Mediator } from '@/lib/singletons/Mediator';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';
import { useGlobalStore } from '@/store/api';
import { SingletonContext } from '@/testing';
import WorkspaceShell from '@/features/workspace/components/WorkspaceShell';
import useWorkspaceRuntime from '@/features/workspace/hooks/useWorkspaceRuntime';
import { createDefaultWorkspaceModel } from '@/features/workspace/utils';

// Layout and scene painting do not participate in the request lifecycle.
jest.mock('@/components/api', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual =
    jest.requireActual<typeof import('@/components/api')>('@/components/api');
  const panel = ({ children }: { children: ReactNode }) =>
    React.createElement('div', null, children);
  return {
    ...actual,
    ResizablePanelGroup: panel,
    ResizablePanel: panel,
    ResizableHandle: () => null,
  };
});

jest.mock('@/features/scenepanel/api', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('@/features/scenepanel/api')>(
    '@/features/scenepanel/api'
  );
  return {
    ...actual,
    ScenePanel: ({ content }: { content: { sceneModel: SceneModel } }) =>
      React.createElement(
        'div',
        null,
        `Loaded ${content.sceneModel.simple_name}`
      ),
  };
});

jest.mock('@/lib/messagebox', () => ({ showMessageBox: jest.fn() }));
jest.mock('@/features/workspace/components/WorkspaceFooterContainer', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/features/workspace/components/WorkspaceHeader', () => ({
  __esModule: true,
  default: () => null,
}));

const workspace = createDefaultWorkspaceModel();
workspace.header.visible = false;
workspace.footer.visible = false;

function Workspace() {
  const runtime = useWorkspaceRuntime();
  return <WorkspaceShell workspace={workspace} runtime={runtime} />;
}

const favorite = {
  domain: 'CONTROLS',
  projectUuid: 'motors',
  projectName: 'Motors',
};

describe('opening a favorite in the workspace', () => {
  let context: SingletonContext;
  let panelContext: SingletonContext;
  let config: ConfigurationStore;
  let mediator: Mediator;
  let projectModel: ProjectItemModel;
  let wrangler: PanelWrangler;
  let loadingProject: ProjectModel;
  const listProjects = jest.fn();
  const loadProject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    config = new ConfigurationStore();
    config.addProjectFavorite('TOPIC_A', favorite);
    mediator = new Mediator();
    projectModel = new ProjectItemModel();
    context = new SingletonContext({
      config,
      mediator,
      project_model: projectModel,
      db_conn: { listProjects, loadProject },
      logger: { info: jest.fn() },
    });
    wrangler = new PanelWrangler();
    panelContext = new SingletonContext({ panel_wrangler: wrangler });
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
    listProjects.mockImplementation(() => {
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
    loadProject.mockImplementation((_domain: string, project: ProjectModel) => {
      loadingProject = project;
      mediator.postEvent(
        KaraboEvent.DatabaseBusy,
        new Hash({ is_processing: true })
      );
    });
  });

  afterEach(() => {
    cleanup();
    wrangler.dispose();
    panelContext.restore();
    context.restore();
    useGlobalStore.getState().reset();
    localStorage.clear();
  });

  async function openFavorite() {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Workspace />
      </MemoryRouter>
    );
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Open favorite Motors' })
      );
    });
    expect(screen.getByTestId('project-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('home-panel')).not.toBeInTheDocument();
  }

  it('loads the requested project and activates Projects without opening a scene after the loading screen unmounts Home', async () => {
    await openFavorite();
    const scene = new SceneModel({
      uuid: 'motor-scene',
      simple_name: 'Fresh Motor Scene',
      initialized: true,
    });
    await act(async () => {
      loadingProject.scenes = [scene];
      loadingProject.initialized = true;
      mediator.postEvent(
        KaraboEvent.DatabaseBusy,
        new Hash({ is_processing: false })
      );
    });

    expect(screen.queryByTestId('project-loading')).not.toBeInTheDocument();
    expect(projectModel.root).toBe(loadingProject);
    expect(projectModel.domain).toBe('CONTROLS');
    expect(listProjects).toHaveBeenCalledWith('CONTROLS');
    expect(loadProject).toHaveBeenCalledWith('CONTROLS', loadingProject);
    expect(wrangler.getSnapshot().left.activeTabId).toBe('projects');
    expect(wrangler.getSnapshot().center.tabs).toHaveLength(0);
    expect(wrangler.isSceneTabOpen()).toBe(false);
    expect(config.getProjectFavorites('TOPIC_A')).toEqual([favorite]);
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('returns to Home after failure, reports the error, and permits another open', async () => {
    await openFavorite();
    await act(async () => {
      mediator.postEvent(
        KaraboEvent.DatabaseBusy,
        new Hash({ is_processing: false, loading_failed: true })
      );
    });
    const open = await screen.findByRole('button', {
      name: 'Open favorite Motors',
    });
    expect(open).toBeEnabled();
    expect(projectModel.root).toBeUndefined();
    expect(showMessageBox).toHaveBeenCalledWith({
      variant: 'error',
      title: 'Could not open project',
      msg: 'Could not load project "Motors".',
    });
    expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual([
      favorite,
    ]);

    await act(async () => {
      fireEvent.click(open);
    });
    await waitFor(() => expect(loadProject).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('project-loading')).toBeInTheDocument();
    // Finish the second request so it leaves no event listeners behind.
    await act(async () => {
      loadingProject.scenes = [
        new SceneModel({
          uuid: 'motor-scene',
          simple_name: 'Motor Scene',
          initialized: true,
        }),
      ];
      loadingProject.initialized = true;
      mediator.postEvent(
        KaraboEvent.DatabaseBusy,
        new Hash({ is_processing: false })
      );
    });
  });
});
