import { act, render, screen } from '@testing-library/react';
import type { PanelAreaState } from '@/features/workspace/types';
import WorkspacePage from '../WorkspacePage';

const mockUseLocation = jest.fn();
const mockUseWorkspaceRuntime = jest.fn();
const mockWorkspaceShell = jest.fn();
const mockSubscribe = jest.fn();
const mockGetSnapshot = jest.fn();

const mockPanelWrangler = {
  subscribe: mockSubscribe,
  getSnapshot: mockGetSnapshot,
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

function makePanelState(
  activeTabId: string | undefined,
  projectLoading = false
): PanelAreaState & { projectLoading: boolean } {
  return {
    projectLoading,
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
        '?host=exflqr35160.desy.de&port=44444&domain=CONTROLS&projectUuid=project-1&sceneUuid=scene-1',
    });
    mockUseWorkspaceRuntime.mockReturnValue({
      connected: true,
      topic: 'oludedav',
    });
    mockSubscribe.mockImplementation(() => jest.fn());
    mockGetSnapshot.mockReturnValue(makePanelState('scene:scene-1'));
  });

  it('renders the workspace with loading state from the panel wrangler', () => {
    render(<WorkspacePage />);

    expect(screen.getByTestId('scene-bootstrap')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
    expect(mockWorkspaceShell).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: expect.objectContaining({ id: 'workspace-main' }),
        runtime: { connected: true, topic: 'oludedav' },
        projectLoading: false,
      })
    );
  });

  it('updates loading feedback when the panel wrangler announces a change', () => {
    let notify = () => {};
    mockSubscribe.mockImplementation((listener: () => void) => {
      notify = listener;
      return jest.fn();
    });
    render(<WorkspacePage />);

    act(() => {
      mockGetSnapshot.mockReturnValue(makePanelState('home', true));
      notify();
    });

    expect(mockWorkspaceShell).toHaveBeenLastCalledWith(
      expect.objectContaining({ projectLoading: true })
    );
  });

  it('creates the panel wrangler only once across rerenders of the same page instance', () => {
    const { rerender } = render(<WorkspacePage />);

    rerender(<WorkspacePage />);

    expect(mockGetPanelWrangler).toHaveBeenCalledTimes(1);
  });
});
