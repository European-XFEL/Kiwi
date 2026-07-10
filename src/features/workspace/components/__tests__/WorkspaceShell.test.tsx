import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createDefaultWorkspaceModel } from '../../utils';
import type { WorkspaceRuntime } from '../../types';
import WorkspaceShell from '../WorkspaceShell';
import { useActiveSceneStore } from '@/features/scene-view/hooks/useActiveScene';
import { SceneControllerRegistry } from '@/features/scenepanel/SceneControllerRegistry';

const mockHeader = jest.fn();
const mockFooter = jest.fn();
const mockBody = jest.fn();
const mockGetContent = jest.fn();

jest.mock('../WorkspaceHeader', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: (props: unknown) => {
      mockHeader(props);
      return React.createElement('div', { 'data-testid': 'workspace-header' });
    },
  };
});

jest.mock('../WorkspaceFooter', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: (props: unknown) => {
      mockFooter(props);
      return React.createElement('div', { 'data-testid': 'workspace-footer' });
    },
  };
});

jest.mock('../WorkspaceBody', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: ({
      body,
      renderLeftPanel,
      renderCenterPanel,
      renderRightPanel,
      centerEmptyState,
    }: {
      body: unknown;
      renderLeftPanel: (tab: {
        id: string;
        title: string;
        closable: boolean;
      }) => ReactNode;
      renderCenterPanel: (tab: {
        id: string;
        title: string;
        closable: boolean;
      }) => ReactNode;
      renderRightPanel: (tab: {
        id: string;
        title: string;
        closable: boolean;
      }) => ReactNode;
      centerEmptyState: ReactNode;
    }) => {
      mockBody({
        body,
        renderLeftPanel,
        renderCenterPanel,
        renderRightPanel,
        centerEmptyState,
      });

      return React.createElement(
        'div',
        { 'data-testid': 'workspace-body' },
        React.createElement(
          'div',
          { 'data-testid': 'left-slot' },
          renderLeftPanel({ id: 'left-tab', title: 'Left', closable: true }) ??
            'left-empty'
        ),
        React.createElement(
          'div',
          { 'data-testid': 'center-home' },
          renderCenterPanel({ id: 'home', title: 'Home', closable: false })
        ),
        React.createElement(
          'div',
          { 'data-testid': 'center-scene' },
          renderCenterPanel({
            id: 'scene:scene-42',
            title: 'scene-42',
            closable: true,
          })
        ),
        React.createElement(
          'div',
          { 'data-testid': 'center-pending' },
          renderCenterPanel({
            id: 'scene:missing',
            title: 'missing',
            closable: true,
          })
        ),
        React.createElement(
          'div',
          { 'data-testid': 'right-slot' },
          renderRightPanel({
            id: 'right-tab',
            title: 'Right',
            closable: true,
          }) ?? 'right-empty'
        ),
        React.createElement(
          'div',
          { 'data-testid': 'center-empty-state' },
          centerEmptyState
        )
      );
    },
  };
});

jest.mock('@/lib/singletons/api', () => ({
  getPanelWrangler: () => ({
    getContent: mockGetContent,
  }),
}));

jest.mock('@/app/HomePanel', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: () =>
      React.createElement('div', { 'data-testid': 'home-panel' }, 'home'),
  };
});

jest.mock('@/features/scenepanel/api', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    ScenePanel: ({ content }: { content: { sceneRef: { uuid: string } } }) =>
      React.createElement(
        'div',
        { 'data-testid': 'scene-panel' },
        `scene:${content.sceneRef.uuid}`
      ),
  };
});

jest.mock('@/features/scene-view/components/SceneStatusViews', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    ScenePending: () =>
      React.createElement('div', { 'data-testid': 'scene-pending' }, 'pending'),
  };
});

function renderWorkspaceShell(
  workspace = createDefaultWorkspaceModel(),
  runtime: WorkspaceRuntime = { connected: true, topic: 'oludedav' }
) {
  return render(<WorkspaceShell workspace={workspace} runtime={runtime} />);
}

describe('WorkspaceShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useActiveSceneStore.setState({ sceneLoadPending: false });
    mockGetContent.mockImplementation((tabId: string) => {
      if (tabId === 'scene:scene-42') {
        const sceneRef = {
          uuid: 'scene-42',
          domain: 'CONTROLS',
          projectUuid: 'project-1',
          projectName: 'David_test',
          name: 'box_layout',
          width: 800,
          height: 600,
        };
        return {
          sceneRef,
          sceneModel: { uuid: 'scene-42' },
          sceneControllerRegistry: new SceneControllerRegistry(sceneRef),
          fitMode: 'fit-page',
        };
      }

      return undefined;
    });
  });

  it('composes the workspace shell and resolves center tabs from the panel wrangler', () => {
    const workspace = createDefaultWorkspaceModel();
    const runtime = { connected: true, topic: 'oludedav' };

    renderWorkspaceShell(workspace, runtime);

    expect(screen.getByTestId('workspace-header')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-body')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-footer')).toBeInTheDocument();
    expect(screen.getByTestId('home-panel')).toBeInTheDocument();
    expect(screen.getByTestId('scene-panel')).toHaveTextContent(
      'scene:scene-42'
    );
    expect(screen.getByTestId('scene-pending')).toBeInTheDocument();
    expect(screen.getByTestId('left-slot')).toHaveTextContent('left-empty');
    expect(screen.getByTestId('right-slot')).toHaveTextContent('right-empty');
    expect(screen.getByText('No scene open')).toBeInTheDocument();
    expect(mockBody).toHaveBeenCalledWith(
      expect.objectContaining({
        body: workspace.body,
        centerEmptyState: expect.anything(),
      })
    );
    expect(mockHeader).toHaveBeenCalledWith(
      expect.objectContaining({ header: workspace.header, runtime })
    );
    expect(mockFooter).toHaveBeenCalledWith(
      expect.objectContaining({ footer: workspace.footer, runtime })
    );
  });

  it('shows the pending scene state immediately for scene URLs', () => {
    const workspace = createDefaultWorkspaceModel();

    useActiveSceneStore.setState({ sceneLoadPending: true });

    renderWorkspaceShell(workspace, { connected: true });

    expect(screen.queryByTestId('home-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('center-home')).toHaveTextContent('pending');
  });

  it('omits the header when the workspace model marks it as hidden', () => {
    const workspace = createDefaultWorkspaceModel();
    workspace.header.visible = false;

    renderWorkspaceShell(workspace, { connected: true });

    expect(screen.queryByTestId('workspace-header')).not.toBeInTheDocument();
    expect(screen.getByTestId('workspace-body')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-footer')).toBeInTheDocument();
  });
});
