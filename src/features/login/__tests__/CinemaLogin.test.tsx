import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  useApplicationModeStore,
  useAppSettingsStore,
  useGlobalStore,
} from '@/store/api';
import { ConfigurationStore } from '@/lib/singletons/Configuration';
import { SingletonContext } from '@/testing';
import type { GuiServerInfo } from '../auth.types';
import { LoginPage } from '../LoginPage';

const mockProbe = jest.fn();
const startSession = jest.fn();
let context: SingletonContext;

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  probeServer: (...args: unknown[]) => mockProbe(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  useGlobalStore.getState().reset();
  useApplicationModeStore.setState(
    { mode: 'cinema', launch: { sceneUuids: ['a'] } },
    true
  );
  useAppSettingsStore.setState({ topicServerMapping: 'OLD:other-host:55555' });
  const config = new ConfigurationStore();
  config.lastHost = 'saved-host';
  config.lastPort = 44444;
  context = new SingletonContext({
    config,
    network: { startNonAuthSession: startSession },
  });
});

afterEach(() => {
  cleanup();
  context.restore();
  useGlobalStore.getState().reset();
  useApplicationModeStore.setState({ mode: 'normal' }, true);
  useAppSettingsStore.setState({ topicServerMapping: '' });
  localStorage.clear();
});

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function showLogin() {
  render(
    <MemoryRouter initialEntries={['/cinema']}>
      <LoginPage />
      <Location />
    </MemoryRouter>
  );
}

it.each([
  [undefined, 'saved-host', '44444'],
  [{ host: 'cinema-host', port: 12345 }, 'cinema-host', '12345'],
] as const)(
  'prefills the cinema server ahead of topic mappings: %j',
  async (server, host, port) => {
    mockProbe.mockImplementation(() => new Promise(() => {}));
    useApplicationModeStore.setState({
      launch: { sceneUuids: ['a'], ...server },
    });
    showLogin();
    expect(screen.getByTestId('login-host')).toHaveValue(host);
    expect(screen.getByTestId('login-port')).toHaveValue(port);
    expect(screen.queryByTestId('login-topic')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockProbe).toHaveBeenCalledWith(host, Number(port))
    );
  }
);

it.each(['login', 'observer'])(
  'keeps the bookmark after connecting through %s',
  async (action) => {
    const user = userEvent.setup();
    useApplicationModeStore.setState({
      launch: { sceneUuids: ['a'], host: 'cinema-host', port: 12345 },
    });
    const serverInfo: GuiServerInfo = {
      deviceId: 'gui',
      hostname: 'cinema-host',
      hostport: 12345,
      authRequired: action === 'observer',
      authServer: '',
      readOnly: false,
      topic: 'TOPIC',
      version: '2.20',
    };
    mockProbe.mockResolvedValue(serverInfo);
    startSession.mockImplementation(
      async (
        host: string,
        port: number,
        userId: string,
        accessLevel: number,
        isReadOnly: boolean
      ) => ({
        host,
        port,
        userId,
        accessLevel,
        isReadOnly,
        topic: 'TOPIC',
        serverVersion: '2.20',
      })
    );
    showLogin();
    if (action === 'login') {
      await user.type(await screen.findByLabelText('Username'), 'Ada');
      await user.click(screen.getByRole('button', { name: 'Login' }));
    } else {
      await user.click(
        await screen.findByRole('button', { name: 'Connect Read-Only' })
      );
    }
    await waitFor(() =>
      expect(useGlobalStore.getState().sessionInfo?.loggedUser).toBe(
        action === 'login' ? 'Ada' : 'Observer'
      )
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/cinema');
    expect(useApplicationModeStore.getState().launch?.sceneUuids).toEqual([
      'a',
    ]);
  }
);
