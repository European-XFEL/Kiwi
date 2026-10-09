import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { SceneModel } from '@/karabo/common/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { getPanelWrangler } from '@/lib/singletons/api';
import { createDefaultWorkspaceModel } from '../../utils';
import WorkspaceShell from '../WorkspaceShell';

jest.mock('../WorkspaceHeader', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../WorkspaceFooterContainer', () => ({
  __esModule: true,
  default: () => null,
}));

describe('WorkspaceShell fullscreen', () => {
  let activeElement: Element | null;

  function changeFullscreen(element: Element | null) {
    activeElement = element;
    document.dispatchEvent(new Event('fullscreenchange'));
  }

  beforeEach(() => {
    activeElement = null;
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => activeElement,
    });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: jest.fn(function (this: HTMLElement) {
        changeFullscreen(this);
        return Promise.resolve();
      }),
    });
    document.exitFullscreen = jest.fn(() => {
      changeFullscreen(null);
      return Promise.resolve();
    });

    getPanelWrangler().resetCenter();
    for (const name of ['First scene', 'Second scene']) {
      const model = new SceneModel();
      model.uuid = name;
      model.simple_name = name;
      model.width = 800;
      model.height = 600;
      broadcast_event(KaraboEvent.OpenUnattachedScene, { model });
    }
    getPanelWrangler().selectTab('center', 'First scene');
    getPanelWrangler().setFitMode('First scene', 'fit-width');
  });

  afterEach(() => {
    cleanup();
    getPanelWrangler().resetCenter();
    Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
    Reflect.deleteProperty(document, 'exitFullscreen');
    Reflect.deleteProperty(document, 'fullscreenEnabled');
    Reflect.deleteProperty(document, 'fullscreenElement');
  });

  function renderWorkspace() {
    const workspace = createDefaultWorkspaceModel();
    workspace.header.visible = false;
    workspace.footer.visible = false;
    return render(
      <WorkspaceShell workspace={workspace} runtime={{ connected: true }} />
    );
  }

  it('requests fullscreen on the inner center container including tabs and excluding side panels', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'View full screen' }));

    const center = document.getElementById('workspace-panel-center');
    expect(document.fullscreenElement).toBe(center);
    expect(center).toContainElement(
      screen.getByRole('tablist', { name: 'center panel' })
    );
    expect(center).toContainElement(screen.getByTestId('scene-panel'));
    expect(center).not.toContainElement(
      document.getElementById('workspace-panel-left')
    );
    expect(center).not.toContainElement(
      document.getElementById('workspace-panel-right')
    );
    expect(center?.parentElement).toHaveAttribute(
      'data-slot',
      'resizable-panel'
    );
  });

  it('preserves fullscreen and each scene fit mode when switching tabs', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'View full screen' }));
    const center = document.fullscreenElement;
    expect(screen.getByRole('combobox', { name: 'Fit mode' })).toHaveValue(
      'fit-width'
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Second scene' }));

    expect(document.fullscreenElement).toBe(center);
    expect(screen.getByRole('tab', { name: 'Second scene' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(
      screen.getByRole('button', { name: 'Exit full screen' })
    ).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByRole('combobox', { name: 'Fit mode' }), {
      target: { value: 'actual' },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'First scene' }));
    expect(screen.getByRole('combobox', { name: 'Fit mode' })).toHaveValue(
      'fit-width'
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Second scene' }));
    expect(screen.getByRole('combobox', { name: 'Fit mode' })).toHaveValue(
      'actual'
    );
  });

  it('resets the toolbar state on exit and native fullscreenchange events', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'View full screen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(document.fullscreenElement).toBeNull();
    expect(
      screen.getByRole('button', { name: 'View full screen' })
    ).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'View full screen' }));
    act(() => changeFullscreen(null));
    expect(
      screen.getByRole('button', { name: 'View full screen' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps Home accessible when scene tabs are closed during fullscreen', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'View full screen' }));
    const center = document.fullscreenElement;
    act(() => getPanelWrangler().resetCenter());
    expect(document.fullscreenElement).toBe(center);
    expect(
      within(center as HTMLElement).getByRole('tab', { name: 'Home' })
    ).toBeInTheDocument();
    act(() => changeFullscreen(null));
    expect(document.fullscreenElement).toBeNull();
  });

  it('hides the fullscreen toggle when the browser does not support fullscreen', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: false });
    renderWorkspace();
    expect(
      screen.queryByTestId('scene-fullscreen-toggle')
    ).not.toBeInTheDocument();
  });
});
