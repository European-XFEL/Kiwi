import { act, render, screen } from '@testing-library/react';
import { createDefaultWorkspaceModel } from '../../utils';
import type { WorkspaceRuntime } from '../../types';
import WorkspaceShell from '../WorkspaceShell';

const mockHeader = jest.fn();
const mockFooter = jest.fn();
const mockBody = jest.fn();

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

jest.mock('../WorkspaceFooterContainer', () => {
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
    default: (props: unknown) => {
      mockBody(props);
      return React.createElement('div', { 'data-testid': 'workspace-body' });
    },
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('composes the shell and delegates panel contents to the body', () => {
    const workspace = createDefaultWorkspaceModel();
    const runtime = { connected: true, topic: 'oludedav' };
    renderWorkspaceShell(workspace, runtime);

    expect(mockBody).toHaveBeenCalledWith({
      body: workspace.body,
      isPageVisible: true,
      showProjectNavigation: true,
    });
    expect(mockHeader).toHaveBeenCalledWith(
      expect.objectContaining({ header: workspace.header, runtime })
    );
    expect(mockFooter).toHaveBeenCalledWith(
      expect.objectContaining({ footer: workspace.footer, runtime })
    );
  });

  it('shows the loading page across the workspace body while a project loads', () => {
    const workspace = createDefaultWorkspaceModel();

    const runtime = { connected: true, projectLoading: true };

    renderWorkspaceShell(workspace, runtime);

    expect(screen.queryByTestId('workspace-body')).not.toBeInTheDocument();
    expect(mockBody).not.toHaveBeenCalled();
    expect(mockHeader).toHaveBeenCalledWith(
      expect.objectContaining({ runtime })
    );
    expect(screen.getByTestId('project-loading')).toHaveTextContent(
      'Loading projectThis might take a while.'
    );
    expect(screen.getByTestId('workspace-footer')).toBeInTheDocument();
  });

  it('passes browser page visibility to the body', () => {
    const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(false);

    renderWorkspaceShell();

    expect(mockBody).toHaveBeenLastCalledWith(
      expect.objectContaining({ isPageVisible: true })
    );

    act(() => {
      hidden.mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockBody).toHaveBeenLastCalledWith(
      expect.objectContaining({ isPageVisible: false })
    );

    act(() => {
      hidden.mockReturnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockBody).toHaveBeenLastCalledWith(
      expect.objectContaining({ isPageVisible: true })
    );
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
