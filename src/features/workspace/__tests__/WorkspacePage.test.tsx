import { render, screen } from '@testing-library/react';
import WorkspacePage from '../WorkspacePage';

const mockUseLocation = jest.fn();
const mockUseWorkspaceRuntime = jest.fn();
const mockWorkspaceShell = jest.fn();

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
  });

  it('renders the workspace with its runtime', () => {
    render(<WorkspacePage />);

    expect(screen.getByTestId('scene-bootstrap')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-shell')).toBeInTheDocument();
    expect(mockWorkspaceShell).toHaveBeenCalledWith({
      workspace: expect.objectContaining({ id: 'workspace-main' }),
      runtime: { connected: true, topic: 'oludedav' },
    });
  });
});
