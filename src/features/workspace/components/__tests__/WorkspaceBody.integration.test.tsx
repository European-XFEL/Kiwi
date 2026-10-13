import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
  within,
} from '@testing-library/react';
import {
  BindingRoot,
  DeviceProxy,
  ProxyStatus,
  StringBinding,
} from '@/lib/binding/api';
import { DisplayTextLogModel, SceneModel } from '@/karabo/common/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { SingletonContext } from '@/testing';
import { SystemTree } from '@/lib/topology/SystemTree';
import { createDefaultWorkspaceModel } from '../../utils';
import WorkspaceBody from '../WorkspaceBody';

jest.unmock('react-resizable-panels');

function mountWorkspace(isPageVisible = true) {
  return render(
    <WorkspaceBody
      body={createDefaultWorkspaceModel().body}
      isPageVisible={isPageVisible}
    />
  );
}

function createDevice(): DeviceProxy {
  const device = new DeviceProxy('DEV');
  const binding = new BindingRoot();
  binding.value!.set('first', new StringBinding({ value: 'first' }));
  binding.value!.set('second', new StringBinding({ value: 'second' }));
  device.binding = binding;
  device.status = ProxyStatus.OFFLINE;
  return device;
}

// Simulate a future right-area tab without adding an unused production API.
function addOtherTab(wrangler: PanelWrangler): void {
  wrangler.getSnapshot().right.tabs.push({
    id: 'other',
    title: 'Other',
    closable: false,
  });
}

describe('WorkspaceBody layout lifetime', () => {
  beforeEach(() => {
    localStorage.clear();
    jest
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockReturnValue(800);
    jest
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockReturnValue(600);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('starts folded with SystemTopology selected and shows Service Manager when unfolded', async () => {
    const wrangler = new PanelWrangler();
    await SingletonContext.run({ panel_wrangler: wrangler }, async () => {
      try {
        mountWorkspace();
        expect(wrangler.getSnapshot().left.activeTabId).toBe('system-topology');
        expect(
          screen.getByRole('button', { name: 'Unfold left panel' })
        ).toHaveAttribute('aria-expanded', 'false');
        await waitFor(() => {
          expect(
            document.getElementById('workspace-left')!.style.flexGrow
          ).toBe('0');
        });
        fireEvent.click(
          screen.getByRole('button', { name: 'Unfold left panel' })
        );
        await waitFor(() => {
          expect(
            document.getElementById('workspace-left')!.style.flexGrow
          ).toBe('24');
        });
        expect(
          screen.getByRole('tab', { name: 'SystemTopology' })
        ).toHaveAttribute('aria-selected', 'true');
        expect(
          screen.getByRole('button', { name: 'Service Manager' })
        ).toBeVisible();
      } finally {
        cleanup();
        wrangler.dispose();
      }
    });
  });

  it('renders Home from its own center area, including when the page is hidden', async () => {
    const wrangler = new PanelWrangler();
    await SingletonContext.run({ panel_wrangler: wrangler }, async () => {
      try {
        mountWorkspace(false);
        expect(
          screen.getByRole('heading', { name: /Kiwi/ })
        ).toBeInTheDocument();
      } finally {
        cleanup();
        wrangler.dispose();
      }
    });
  });

  it('renders the active scene and restores its fit mode after page visibility changes', async () => {
    const wrangler = new PanelWrangler();
    const model = new SceneModel({
      uuid: 'body-scene',
      simple_name: 'body-scene',
      width: 800,
      height: 600,
    });
    await SingletonContext.run({ panel_wrangler: wrangler }, async () => {
      try {
        broadcast_event(KaraboEvent.OpenUnattachedScene, { model });
        const view = mountWorkspace();
        expect(
          screen.getByRole('button', { name: 'Apply all changes' })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('img', { name: 'Unattached scene' })
        ).toBeInTheDocument();
        act(() => wrangler.setFitMode('body-scene', 'fit-width'));
        expect(
          screen.getByRole('combobox', { name: 'Fit mode' })
        ).toHaveTextContent('Fit to Width');
        view.rerender(
          <WorkspaceBody
            body={createDefaultWorkspaceModel().body}
            isPageVisible={false}
          />
        );
        expect(
          screen.queryByRole('button', { name: 'Apply all changes' })
        ).not.toBeInTheDocument();
        view.rerender(
          <WorkspaceBody
            body={createDefaultWorkspaceModel().body}
            isPageVisible
          />
        );
        expect(
          screen.getByRole('combobox', { name: 'Fit mode' })
        ).toHaveTextContent('Fit to Width');
      } finally {
        cleanup();
        wrangler.dispose();
      }
    });
  });

  it('renders scene errors and offers a way back to Home when content is unavailable', async () => {
    const wrangler = new PanelWrangler();
    const model = new SceneModel({
      uuid: 'body-scene',
      simple_name: 'body-scene',
      width: 800,
      height: 600,
    });
    await SingletonContext.run({ panel_wrangler: wrangler }, async () => {
      try {
        broadcast_event(KaraboEvent.OpenUnattachedScene, { model });
        wrangler.setContent('body-scene', { error: 'Scene retrieval failed.' });
        mountWorkspace();
        expect(screen.getByText('Scene retrieval failed.')).toBeInTheDocument();
        act(() => wrangler.setContent('body-scene', {}));
        expect(
          screen.getByText('The scene is unavailable. Try opening it again.')
        ).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Back to Start' }));
        expect(
          screen.getByRole('heading', { name: /Kiwi/ })
        ).toBeInTheDocument();
      } finally {
        cleanup();
        wrangler.dispose();
      }
    });
  });

  it('starts with a single Controllers tab', async () => {
    const wrangler = new PanelWrangler();
    await SingletonContext.run({ panel_wrangler: wrangler }, async () => {
      try {
        mountWorkspace();
        fireEvent.click(
          screen.getByRole('button', { name: 'Unfold right panel' })
        );
        const controllers = screen.getByRole('tab', { name: 'Controllers' });
        expect(controllers).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(controllers, { key: 'ArrowLeft' });
        expect(controllers).toHaveFocus();
        expect(controllers).toHaveAttribute('aria-selected', 'true');
        expect(
          within(
            screen.getByRole('tablist', { name: 'Right area' })
          ).getAllByRole('tab')
        ).toHaveLength(1);
      } finally {
        cleanup();
        wrangler.dispose();
      }
    });
  });

  it('selects, unfolds, and focuses Controllers when opening from another tab', async () => {
    const wrangler = new PanelWrangler();
    addOtherTab(wrangler);
    const device = createDevice();
    await SingletonContext.run(
      {
        panel_wrangler: wrangler,
        topology: { getDevice: () => device, systemTree: new SystemTree() },
        network: { onStopMonitoringDevice: jest.fn() },
      },
      async () => {
        try {
          mountWorkspace();
          fireEvent.click(
            screen.getByRole('button', { name: 'Unfold right panel' })
          );
          const other = screen.getByRole('tab', {
            name: 'Other',
          });
          fireEvent.click(other);
          expect(other).toHaveAttribute('aria-selected', 'true');
          fireEvent.click(
            screen.getByRole('button', { name: 'Fold right panel' })
          );
          const model = new DisplayTextLogModel();
          model.keys = ['DEV.first'];
          act(() => wrangler.openControllerPanel(model));
          expect(
            screen.getByRole('tab', { name: 'Controllers' })
          ).toHaveAttribute('aria-selected', 'true');
          expect(
            screen.getByRole('button', { name: 'Fold right panel' })
          ).toHaveAttribute('aria-expanded', 'true');
          await waitFor(() =>
            expect(document.activeElement).toBe(
              screen.getByRole('region', { name: 'DEV.first' })
            )
          );
          fireEvent.keyDown(screen.getByRole('tab', { name: 'Controllers' }), {
            key: 'ArrowLeft',
          });
          expect(other).toHaveFocus();
          expect(other).toHaveAttribute('aria-selected', 'true');
          fireEvent.click(
            screen.getByRole('button', { name: 'Fold right panel' })
          );
          act(() => wrangler.openControllerPanel(model));
          expect(
            screen.getByRole('tab', { name: 'Controllers' })
          ).toHaveAttribute('aria-selected', 'true');
          expect(wrangler.getSnapshot().right.controllerPanels).toHaveLength(1);
          await waitFor(() =>
            expect(document.activeElement).toBe(
              screen.getByRole('region', { name: 'DEV.first' })
            )
          );
        } finally {
          cleanup();
          wrangler.dispose();
        }
      }
    );
  });

  it('preserves controller heights across tab switches and suspends shared-device monitoring', async () => {
    const wrangler = new PanelWrangler();
    addOtherTab(wrangler);
    const device = createDevice();
    const addMonitor = jest.spyOn(device, 'addMonitor');
    const removeMonitor = jest.spyOn(device, 'removeMonitor');
    const network = { onStopMonitoringDevice: jest.fn() };
    await SingletonContext.run(
      {
        panel_wrangler: wrangler,
        topology: { getDevice: () => device, systemTree: new SystemTree() },
        network,
      },
      async () => {
        try {
          const first = new DisplayTextLogModel();
          first.keys = ['DEV.first'];
          first.height = 350;
          const second = new DisplayTextLogModel();
          second.keys = ['DEV.second'];
          second.height = 350;
          const firstId = wrangler.openControllerPanel(first)!;
          const secondId = wrangler.openControllerPanel(second)!;
          const view = mountWorkspace();
          await waitFor(() =>
            expect(document.getElementById(firstId)!.style.flexGrow).toBe('50')
          );
          const stack = screen.getByRole('region', {
            name: 'Controller panels',
          });
          for (let index = 0; index < 6; index++) {
            fireEvent.keyDown(within(stack).getByRole('separator'), {
              key: 'ArrowDown',
            });
          }
          expect(document.getElementById(firstId)!.style.flexGrow).toBe('80');
          expect(addMonitor).toHaveBeenCalledTimes(2);
          const panels = wrangler.getSnapshot().right.controllerPanels;
          fireEvent.click(screen.getByRole('tab', { name: 'Other' }));
          expect(stack).toBeInTheDocument();
          expect(stack).not.toBeVisible();
          expect(
            screen.queryByRole('region', { name: 'Text log', hidden: true })
          ).not.toBeInTheDocument();
          expect(removeMonitor).toHaveBeenCalledTimes(2);
          expect(network.onStopMonitoringDevice).toHaveBeenCalledTimes(1);
          fireEvent.click(screen.getByRole('tab', { name: 'Controllers' }));
          await waitFor(() =>
            expect(document.getElementById(firstId)!.style.flexGrow).toBe('80')
          );
          expect(document.getElementById(secondId)!.style.flexGrow).toBe('20');
          expect(
            screen.getByRole('region', { name: 'Controller panels' })
          ).toBe(stack);
          expect(wrangler.getSnapshot().right.controllerPanels).toBe(panels);
          expect(addMonitor).toHaveBeenCalledTimes(4);
          view.rerender(
            <WorkspaceBody
              body={createDefaultWorkspaceModel().body}
              isPageVisible={false}
            />
          );
          expect(network.onStopMonitoringDevice).toHaveBeenCalledTimes(2);
          fireEvent.click(screen.getByRole('tab', { name: 'Other' }));
          act(() => {
            wrangler.closeControllerPanel(firstId);
            wrangler.closeControllerPanel(secondId);
          });
          expect(
            screen.getByRole('button', { name: 'Fold right panel' })
          ).toHaveAttribute('aria-expanded', 'true');
          expect(screen.getByRole('tab', { name: 'Other' })).toHaveAttribute(
            'aria-selected',
            'true'
          );
          fireEvent.click(screen.getByRole('tab', { name: 'Controllers' }));
          expect(
            screen.getByRole('button', { name: 'Fold right panel' })
          ).toHaveAttribute('aria-expanded', 'true');
        } finally {
          cleanup();
          wrangler.dispose();
        }
      }
    );
  });

  it('folds after closing the final active controller and retains both right-area tabs', async () => {
    const wrangler = new PanelWrangler();
    addOtherTab(wrangler);
    const device = createDevice();
    await SingletonContext.run(
      {
        panel_wrangler: wrangler,
        topology: { getDevice: () => device, systemTree: new SystemTree() },
        network: { onStopMonitoringDevice: jest.fn() },
      },
      async () => {
        try {
          mountWorkspace();
          const model = new DisplayTextLogModel();
          model.keys = ['DEV.first'];
          act(() => wrangler.openControllerPanel(model));
          await waitFor(() =>
            expect(document.activeElement).toBe(
              screen.getByRole('region', { name: 'DEV.first' })
            )
          );
          fireEvent.click(
            screen.getByRole('button', { name: 'Close DEV.first' })
          );
          expect(
            screen.getByRole('button', { name: 'Unfold right panel' })
          ).toHaveAttribute('aria-expanded', 'false');
          fireEvent.click(
            screen.getByRole('button', { name: 'Unfold right panel' })
          );
          expect(
            screen.getByRole('tab', { name: 'Controllers' })
          ).toBeInTheDocument();
          fireEvent.click(screen.getByRole('tab', { name: 'Other' }));
          expect(screen.getByRole('tabpanel', { name: 'Other' })).toBeVisible();
        } finally {
          cleanup();
          wrangler.dispose();
        }
      }
    );
  });

  it('starts from defaults even when an old layout exists in storage', async () => {
    localStorage.setItem(
      'react-resizable-panels:workspace-panel-area:workspace-left:workspace-center:workspace-right',
      JSON.stringify({
        'workspace-left': 23,
        'workspace-center': 42,
        'workspace-right': 35,
      })
    );
    const wrangler = new PanelWrangler();
    await SingletonContext.run({ panel_wrangler: wrangler }, async () => {
      try {
        mountWorkspace();
        expect(
          screen.getByRole('button', { name: 'Unfold left panel' })
        ).toHaveAttribute('aria-expanded', 'false');
        expect(
          screen.getByRole('button', { name: 'Unfold right panel' })
        ).toHaveAttribute('aria-expanded', 'false');
        await waitFor(() => {
          expect(
            document.getElementById('workspace-center')!.style.flexGrow
          ).toBe('100');
        });
      } finally {
        cleanup();
        wrangler.dispose();
      }
    });
  });

  it('keeps widths in memory and resets them when the workspace remounts', async () => {
    const wrangler = new PanelWrangler();
    await SingletonContext.run({ panel_wrangler: wrangler }, async () => {
      try {
        const workspace = mountWorkspace();
        await waitFor(() => {
          expect(
            document.getElementById('workspace-center')!.style.flexGrow
          ).toBe('100');
        });
        fireEvent.click(
          screen.getByRole('button', { name: 'Unfold left panel' })
        );
        expect(
          screen.getByRole('button', { name: 'Fold left panel' })
        ).toHaveAttribute('aria-expanded', 'true');
        expect(localStorage.length).toBe(0);
        workspace.unmount();

        mountWorkspace();
        expect(
          screen.getByRole('button', { name: 'Unfold left panel' })
        ).toHaveAttribute('aria-expanded', 'false');
        await waitFor(() => {
          expect(
            document.getElementById('workspace-center')!.style.flexGrow
          ).toBe('100');
        });
        expect(localStorage.length).toBe(0);
      } finally {
        cleanup();
        wrangler.dispose();
      }
    });
  });
});
