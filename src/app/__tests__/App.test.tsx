import { StrictMode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useApplicationModeStore, useGlobalStore } from '@/store/api';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { ConfigurationStore } from '@/lib/singletons/Configuration';
import { SingletonContext } from '@/testing';
import { initializeApplicationMode } from '../initializeApplicationMode';
import App from '../App';
import AppBody from '../AppBody';

jest.mock('@/features/controllers/api', () => ({
  bootstrapStatefulIcons: jest.fn(),
}));
jest.mock('../AppSettings', () => ({
  initAppSettings: () => ({ wsProxyURL: '', topicGuiServerMapping: '' }),
}));
jest.mock('@/features/login/utils', () => ({
  ...jest.requireActual('@/features/login/utils'),
  probeServer: () => new Promise(() => {}),
}));

const resume = jest.fn();
let context: SingletonContext;
let wrangler: PanelWrangler;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  useGlobalStore.getState().reset();
  useApplicationModeStore.setState({ mode: 'normal' }, true);
  const config = new ConfigurationStore();
  config.lastHost = 'saved-host';
  config.lastPort = 44444;
  wrangler = new PanelWrangler();
  context = new SingletonContext({
    config,
    panel_wrangler: wrangler,
    network: { resumeGuiSession: resume },
    manager: {},
  });
});

afterEach(() => {
  cleanup();
  wrangler.dispose();
  context.restore();
  useGlobalStore.getState().reset();
  useApplicationModeStore.setState({ mode: 'normal' }, true);
  window.history.replaceState(null, '', '/main');
  localStorage.clear();
  sessionStorage.clear();
});

function startApplication(url: string) {
  window.history.replaceState(null, '', url);
  initializeApplicationMode();
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[window.location.pathname]}>
        <App />
        <AppBody />
      </MemoryRouter>
    </StrictMode>
  );
}

it.each([
  '/main',
  '/cinema?scene_uuid=a',
  '/cinema?scene_uuid=a&host=saved-host&port=44444',
])(
  'resumes the saved session once and starts the correct workspace for %s',
  async (url) => {
    resume.mockResolvedValue({
      host: 'saved-host',
      port: 44444,
      userId: 'user',
      accessLevel: 0,
      isReadOnly: true,
      topic: 'TOPIC',
      serverVersion: '2.20',
    });
    startApplication(url);
    await waitFor(() =>
      expect(useGlobalStore.getState().globalState).toBe('LOGGED_IN')
    );
    expect(resume.mock.calls).toEqual([['saved-host', 44444]]);
    expect(useGlobalStore.getState().sessionInfo?.loggedUser).toBe('user');
    expect(wrangler.getSnapshot().center.activeTabId).toBe(
      url.startsWith('/cinema') ? 'cinema' : 'home'
    );
  }
);

it('shows login for another cinema server without reusing saved credentials', () => {
  startApplication('/cinema?scene_uuid=a&host=other-host&port=1234');
  expect(screen.getByTestId('login-host')).toHaveValue('other-host');
  expect(screen.getByTestId('login-port')).toHaveValue('1234');
  expect(resume).not.toHaveBeenCalled();
});

it.each(['/cinema', '/cinema?scene_uuid='])(
  'shows a cinema error before connecting for %s',
  (url) => {
    startApplication(url);
    expect(screen.getByRole('alert')).toHaveTextContent('Cinema error');
    expect(
      screen.getByText(/Open a valid \/cinema bookmark/)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    expect(wrangler.getSnapshot().center.activeTabId).toBe('cinema');
    expect(resume).not.toHaveBeenCalled();
  }
);
