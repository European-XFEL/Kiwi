import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { retrieveDefaultDeviceScene } from '@/features/project/api';
import { showMessageBox } from '@/lib/messagebox';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { SingletonContext } from '@/testing';
import { SystemTree } from '@/lib/topology/SystemTree';
import WorkspaceLeftArea from '../WorkspaceLeftArea';

jest.mock('@/features/project/api', () => ({
  ...jest.requireActual('@/features/project/api'),
  retrieveDefaultDeviceScene: jest.fn(),
}));
jest.mock('@/lib/messagebox', () => ({ showMessageBox: jest.fn() }));

describe('WorkspaceLeftArea', () => {
  let wrangler: PanelWrangler;
  let context: SingletonContext;
  const isDeviceOnline = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    wrangler = new PanelWrangler();
    context = new SingletonContext({
      panel_wrangler: wrangler,
      topology: { isDeviceOnline, systemTree: new SystemTree() },
    });
  });

  afterEach(() => {
    cleanup();
    wrangler.dispose();
    context.restore();
  });

  it('selects panels by tab ID while preserving both left tabs', () => {
    wrangler.getSnapshot().left.tabs.push({
      id: 'other-left',
      title: 'Other left',
      closable: false,
    });
    render(<WorkspaceLeftArea />);
    const topology = screen.getByRole('tab', { name: 'SystemTopology' });
    expect(topology).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('button', { name: 'Service Manager' })
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Close SystemTopology' })
    ).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Other left' }));
    expect(wrangler.getSnapshot().left.activeTabId).toBe('other-left');
    expect(
      screen.getByRole('tabpanel', { name: 'Other left' })
    ).toBeEmptyDOMElement();
    expect(
      screen.queryByRole('button', { name: 'Service Manager' })
    ).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(3);

    fireEvent.click(topology);
    expect(wrangler.getSnapshot().left.activeTabId).toBe('system-topology');
    expect(
      screen.getByRole('button', { name: 'Service Manager' })
    ).toBeVisible();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('reports an offline Service Manager without requesting its scene', () => {
    isDeviceOnline.mockReturnValue(false);
    render(<WorkspaceLeftArea />);
    const button = screen.getByRole('button', { name: 'Service Manager' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(isDeviceOnline).toHaveBeenCalledWith('KaraboDaemonManager');
    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        msg: expect.stringContaining('KaraboDaemonManager'),
      })
    );
    expect(retrieveDefaultDeviceScene).not.toHaveBeenCalled();
  });

  it('opens the default Service Manager scene when online', () => {
    isDeviceOnline.mockReturnValue(true);
    render(<WorkspaceLeftArea />);
    fireEvent.click(screen.getByRole('button', { name: 'Service Manager' }));
    expect(isDeviceOnline).toHaveBeenCalledWith('KaraboDaemonManager');
    expect(retrieveDefaultDeviceScene).toHaveBeenCalledTimes(1);
    expect(retrieveDefaultDeviceScene).toHaveBeenCalledWith(
      'KaraboDaemonManager'
    );
    expect(showMessageBox).not.toHaveBeenCalled();
  });
});
