import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { SceneModel } from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/api';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { SingletonContext } from '@/testing';
import { createDefaultWorkspaceModel } from '../../utils';
import WorkspaceShell from '../WorkspaceShell';

// Use the real layouts without importing the Vite-only application startup.
jest.mock('@/app/api', () => ({
  KiwiHeader: jest.requireActual('@/app/layouts/Header').default,
  Footer: jest.requireActual('@/app/layouts/Footer').default,
}));

it('keeps cinema controls available during loading and restores the empty tab after closing scenes', async () => {
  const wrangler = new PanelWrangler();
  wrangler.setMode('cinema');
  await SingletonContext.run({ panel_wrangler: wrangler }, () => {
    try {
      broadcast_event(KaraboEvent.OpenUnattachedScene, {
        model: new SceneModel({
          uuid: 'overview',
          simple_name: 'Overview',
          initialized: true,
        }),
        tabId: 'database-scene:overview',
      });
      const workspace = createDefaultWorkspaceModel('cinema');
      workspace.footer.visible = false;
      render(
        <WorkspaceShell
          workspace={workspace}
          runtime={{
            connected: true,
            projectLoading: true,
            sceneTabOpen: true,
            activity: { lastActivity: 1, activityLevel: 'active' },
            access: {
              accessLevel: AccessLevel.OPERATOR,
              canChangeLevel: true,
              canChangeTo: () => true,
              onChange: jest.fn(),
            },
            user: { loggedUser: 'Ada', onLogout: jest.fn() },
          }}
        />
      );
      expect(screen.queryByTestId('project-loading')).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Apply all changes' })
      ).toBeInTheDocument();
      expect(document.getElementById('workspace-header')).not.toHaveAttribute(
        'inert'
      );
      expect(document.getElementById('workspace-header')).toHaveAttribute(
        'aria-busy',
        'false'
      );
      expect(
        screen.queryByTestId('workspace-home-button')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('No project loaded')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Change access level' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'User menu' })
      ).toBeInTheDocument();
      expect(
        screen.getByTitle('Receiving data from GUI server')
      ).toBeInTheDocument();
      act(() =>
        wrangler.setContent('database-scene:overview', {
          error: 'Scene unavailable',
        })
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Scene unavailable');
      expect(screen.queryByTestId('scene-error-back')).not.toBeInTheDocument();
      act(() => wrangler.setContent('database-scene:overview', {}));
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The scene is unavailable'
      );
      expect(screen.queryByTestId('scene-error-back')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Close Overview' }));
      expect(screen.getByRole('tab', { name: 'Cinema' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Close Cinema' })
      ).not.toBeInTheDocument();
      expect(screen.getByText('No scene open')).toBeInTheDocument();
    } finally {
      cleanup();
      wrangler.dispose();
    }
  });
});
