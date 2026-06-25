import { render, screen, waitFor } from '@testing-library/react';
import type { PanelAreaState } from '@/features/workspace/types';
import WorkspacePage from '../WorkspacePage';

const mockUseLocation = jest.fn();
const mockUseWorkspaceRuntime = jest.fn();
const mockWorkspaceShell = jest.fn();
const mockSubscribe = jest.fn();
const mockGetSnapshot = jest.fn();
const mockGetContent = jest.fn();
const mockSetLoadedSceneRef = jest.fn();

const mockPanelWrangler = {
  subscribe: mockSubscribe,
  getSnapshot: mockGetSnapshot,
  getContent: mockGetContent,
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useLocation: () => mockUseLocation(),
}));

jest.mock('../components/SceneBootstrap', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: () =>
      React.createElement('div', { 'data-testid': 'scene-bootstrap' }),
  };
});

jest.mock('../components/WorkspaceShell', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: (props: unknown) => {
      mockWorkspaceShell(props);
      return React.createElement('div', { 'data-testid': 'workspace-shell' });
    },
  };
});

jest.mock('../hooks/useWorkspaceRuntime', () => ({
  __esModule: true,
  default: () => mockUseWorkspaceRuntime(),
}));

const mockGetPanelWrangler = jest.fn(() => mockPanelWrangler);

jest.mock('@/lib/singletons/api', () => ({
  getPanelWrangler: () => mockGetPanelWrangler(),
}));

jest.mock('@/features/scene-view/api', () => ({
  useActiveSceneStore: (
    selector?: (state: {
      setLoadedSceneRef: typeof mockSetLoadedSceneRef;
    }) => unknown
  ) => {
    const state = { setLoadedSceneRef: mockSetLoadedSceneRef };
    return selector ? selector(state) : state;
  },
}));

function makePanelState(activeTabId: string | undefined): PanelAreaState {
  return {
    left: { id: 'left', tabs: [], activeTabId: undefined },
    center: {
      id: 'center',
      tabs: activeTabId
        ? [
            {
              id: activeTabId,
              title: activeTabId,
              closable: activeTabId !== 'home',
            },
          ]
        : [],
      activeTabId,
    },
    right: { id: 'right', tabs: [], activeTabId: undefined },
  };
}

describe('WorkspacePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocation.mockReturnValue({
      search:
        '?host=exflqr35160.desy.de&port=44444&domain=CONTROLS&projectName=David_test&uuid=scene-1',
    });
    mockUseWorkspaceRuntime.mockReturnValue({
      connected: true,
      topic: 'oludedav',
    });
    mockSubscribe.mockImplementation(() => jest.fn());
    mockGetSnapshot.mockReturnValue(makePanelState('scene:scene-1'));
    mockGetContent.mockReturnValue({
      sceneRef: {
        uuid: 'scene-1',
        domain: 'CONTROLS',
        projectName: 'David_test',
        name: 'box_layout',
      },
    });
  });

  it('initializes the panel wrangler and syncs the active scene into global state', async () => {
    render(<WorkspacePage />);

    expect(screen.getByTestId('scene-bootstrap')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
    expect(mockWorkspaceShell).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: expect.objectContaining({ id: 'workspace-main' }),
        runtime: { connected: true, topic: 'oludedav' },
      })
    );

    await waitFor(() => {
      expect(mockSetLoadedSceneRef).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: 'scene-1' })
      );
    });
  });

  it('clears the active scene when the center tab is the home tab', async () => {
    mockGetSnapshot.mockReturnValue(makePanelState('home'));
    mockGetContent.mockReturnValue(undefined);

    render(<WorkspacePage />);

    await waitFor(() => {
      expect(mockSetLoadedSceneRef).toHaveBeenCalledWith(undefined);
    });
  });

  it('clears the active scene while a non-home center tab is still pending', async () => {
    mockGetSnapshot.mockReturnValue(makePanelState('scene:pending-scene'));
    mockGetContent.mockReturnValue(undefined);

    render(<WorkspacePage />);

    await waitFor(() => {
      expect(mockSetLoadedSceneRef).toHaveBeenCalledWith(undefined);
    });
  });

  it('creates the panel wrangler only once across rerenders of the same page instance', () => {
    const { rerender } = render(<WorkspacePage />);

    rerender(<WorkspacePage />);

    expect(mockGetPanelWrangler).toHaveBeenCalledTimes(1);
  });
});
