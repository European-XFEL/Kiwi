import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createDefaultWorkspaceModel } from '../../utils';
import WorkspaceShell from '../WorkspaceShell';

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

jest.mock('@/app/NoScenePanel', () => {
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
    ScenePanel: ({ sceneRef }: { sceneRef: { uuid: string } }) =>
      React.createElement(
        'div',
        { 'data-testid': 'scene-panel' },
        `scene:${sceneRef.uuid}`
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

describe('WorkspaceShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContent.mockImplementation((tabId: string) => {
      if (tabId === 'scene:scene-42') {
        return {
          sceneRef: {
            uuid: 'scene-42',
            domain: 'CONTROLS',
            projectName: 'David_test',
            name: 'box_layout',
          },
          sceneModel: { uuid: 'scene-42' },
        };
      }

      return undefined;
    });
  });

  it('composes the workspace shell and resolves center tabs from the panel wrangler', () => {
    const workspace = createDefaultWorkspaceModel();
    const runtime = { connected: true, topic: 'oludedav' };

    render(<WorkspaceShell workspace={workspace} runtime={runtime} />);

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

  it('omits the header when the workspace model marks it as hidden', () => {
    const workspace = createDefaultWorkspaceModel();
    workspace.header.visible = false;

    render(
      <WorkspaceShell workspace={workspace} runtime={{ connected: true }} />
    );

    expect(screen.queryByTestId('workspace-header')).not.toBeInTheDocument();
    expect(screen.getByTestId('workspace-body')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-footer')).toBeInTheDocument();
  });
});
