import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
const mockAuthenticate = jest.fn();
const startNonAuthSession = jest.fn();
const startAuthSession = jest.fn();
let config: ConfigurationStore;
let context: SingletonContext;

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  probeServer: (...args: unknown[]) => mockProbe(...args),
}));

jest.mock('@/lib/http/AuthServerClient', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    authenticateUser: (...args: unknown[]) => mockAuthenticate(...args),
  })),
}));

const serverInfo: GuiServerInfo = {
  deviceId: 'gui',
  hostname: 'server-host',
  hostport: 12345,
  authRequired: false,
  authServer: '',
  readOnly: false,
  topic: 'SERVER_TOPIC',
  version: '2.20',
};

beforeAll(() => {
  // Radix Select scrolls the focused option; jsdom has no scrolling API.
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: jest.fn(),
  });
});

afterAll(() => {
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockProbe.mockReset();
  mockAuthenticate.mockReset();
  startNonAuthSession.mockReset();
  startAuthSession.mockReset();
  localStorage.clear();
  useGlobalStore.getState().reset();
  useApplicationModeStore.setState({ mode: 'normal' }, true);
  useAppSettingsStore.setState({ topicServerMapping: '' });
  config = new ConfigurationStore();
  config.lastHost = 'saved-host';
  config.lastPort = 44444;
  context = new SingletonContext({
    config,
    network: { startNonAuthSession, startAuthSession },
  });
  mockProbe.mockResolvedValue(serverInfo);
  mockAuthenticate.mockResolvedValue({
    success: true,
    once_token: 'once-token',
    refresh_token: 'refresh-token',
  });
});

afterEach(() => {
  cleanup();
  context.restore();
  jest.useRealTimers();
  useGlobalStore.getState().reset();
  useApplicationModeStore.setState({ mode: 'normal' }, true);
  useAppSettingsStore.setState({ topicServerMapping: '' });
  localStorage.clear();
});

function showLogin() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LoginPage />
    </MemoryRouter>
  );
}

async function finishProbe() {
  await act(async () => {});
}

async function advanceTime(milliseconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
}

function selectOption(testId: string, option: string) {
  fireEvent.keyDown(screen.getByTestId(testId), { key: 'Enter' });
  fireEvent.click(screen.getByRole('option', { name: option }));
}

function setTopicMapping(
  mapping = 'SA1:first-host:12345;SA2:second-host:23456'
) {
  useAppSettingsStore.setState({ topicServerMapping: mapping });
}

it.each([
  ['', 'SA1', 'first-host', 12345],
  ['unknown', 'SA1', 'first-host', 12345],
  ['SA2', 'SA2', 'second-host', 23456],
])(
  'probes only the initial mapped topic for saved topic %s',
  async (savedTopic, topic, host, port) => {
    setTopicMapping();
    config.lastTopic = savedTopic;
    const { unmount } = showLogin();
    expect(screen.getByTestId('topic-select-form')).toBeInTheDocument();
    expect(screen.queryByTestId('host-port-form')).not.toBeInTheDocument();
    expect(mockProbe).toHaveBeenCalledTimes(1);
    expect(mockProbe).toHaveBeenCalledWith(host, port);
    expect(screen.getByTestId('login-topic')).toHaveTextContent(topic);
    expect(screen.getByTestId('login-host-display')).toHaveTextContent(host);
    expect(screen.getByTestId('login-port-display')).toHaveTextContent(
      String(port)
    );
    await finishProbe();
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'Ada' },
    });
    selectOption('login-access-level', 'EXPERT');
    await advanceTime(10_000);
    expect(mockProbe).toHaveBeenCalledTimes(1);
    unmount();
    expect(config.lastTopic).toBe(topic);
  }
);

it.each(['second-host:23456', 'first-host:12345'])(
  'probes immediately on topic selection, including shared endpoints: %s',
  async (secondServer) => {
    setTopicMapping(`SA1:first-host:12345;SA2:${secondServer}`);
    showLogin();
    await finishProbe();
    selectOption('login-topic', 'SA2');
    const [host, port] = secondServer.split(':');
    expect(mockProbe).toHaveBeenCalledTimes(2);
    expect(mockProbe).toHaveBeenLastCalledWith(host, Number(port));
    expect(screen.getByTestId('login-loading')).toHaveTextContent(
      'Probing GUI Server...'
    );
    expect(screen.getByTestId('login-submit')).toBeDisabled();
    await finishProbe();
    await advanceTime(10_000);
    expect(mockProbe).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('login-topic')).toHaveTextContent('SA2');
  }
);

it('keeps the selected mapping when the probed server reports a different topic', async () => {
  setTopicMapping();
  mockProbe.mockResolvedValue({ ...serverInfo, topic: 'SA2' });
  showLogin();
  await finishProbe();
  await advanceTime(10_000);
  expect(screen.getByTestId('login-topic')).toHaveTextContent('SA1');
  expect(screen.getByTestId('login-host-display')).toHaveTextContent(
    'first-host'
  );
  expect(mockProbe).toHaveBeenCalledTimes(1);
});

it('probes the saved host once on mount without a delayed duplicate', async () => {
  showLogin();
  expect(screen.getByTestId('host-port-form')).toBeInTheDocument();
  expect(screen.getByTestId('login-host')).toHaveValue('saved-host');
  expect(screen.getByTestId('login-port')).toHaveValue('44444');
  expect(mockProbe).toHaveBeenCalledWith('saved-host', 44444);
  await finishProbe();
  await advanceTime(10_000);
  expect(mockProbe).toHaveBeenCalledTimes(1);
});

it.each([
  ['login-host', 'new-host'],
  ['login-port', '23456'],
])(
  'clears the reported topic after editing %s and keeps it absent after a failed probe',
  async (testId, value) => {
    mockProbe
      .mockResolvedValueOnce(serverInfo)
      .mockRejectedValueOnce(new Error('Server unavailable'));
    showLogin();
    expect(screen.queryByText(serverInfo.topic)).not.toBeInTheDocument();
    await finishProbe();
    expect(screen.getByText(serverInfo.topic)).toBeInTheDocument();

    fireEvent.change(screen.getByTestId(testId), {
      target: { value },
    });
    expect(screen.queryByText(serverInfo.topic)).not.toBeInTheDocument();
    await advanceTime(2_000);
    expect(mockProbe).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('login-error')).toHaveTextContent(
      'Server unavailable'
    );
    expect(screen.queryByText(serverInfo.topic)).not.toBeInTheDocument();
    expect(screen.getByTestId('login-submit')).toBeDisabled();
  }
);

it('debounces edits to host and port together and invalidates the previous result', async () => {
  showLogin();
  await finishProbe();
  fireEvent.change(screen.getByLabelText('Username'), {
    target: { value: 'Ada' },
  });
  expect(screen.getByTestId('login-submit')).toBeEnabled();
  fireEvent.change(screen.getByTestId('login-host'), {
    target: { value: ' new-host ' },
  });
  expect(screen.getByTestId('login-submit')).toBeDisabled();
  await advanceTime(1_000);
  fireEvent.change(screen.getByTestId('login-port'), {
    target: { value: '23456' },
  });
  await advanceTime(1_999);
  expect(mockProbe).toHaveBeenCalledTimes(1);
  await advanceTime(1);
  expect(mockProbe).toHaveBeenCalledTimes(2);
  expect(mockProbe).toHaveBeenLastCalledWith('new-host', 23456);
  expect(screen.getByLabelText('Username')).toHaveValue('Ada');
});

it('probes on Enter and cancels the pending debounce', async () => {
  showLogin();
  await finishProbe();
  const input = screen.getByTestId('login-host');
  input.focus();
  fireEvent.change(input, { target: { value: 'new-host' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(mockProbe).toHaveBeenLastCalledWith('new-host', 44444);
  await finishProbe();
  expect(input).toHaveFocus();
  await advanceTime(10_000);
  expect(mockProbe).toHaveBeenCalledTimes(2);
});

it.each(['', '0', '65536', 'bad'])(
  'does not probe or enable login for invalid port %s',
  async (port) => {
    showLogin();
    await finishProbe();
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'Ada' },
    });
    fireEvent.change(screen.getByTestId('login-port'), {
      target: { value: port },
    });
    await advanceTime(2_000);
    expect(mockProbe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('login-submit')).toBeDisabled();
    expect(screen.queryByTestId('access-level-form')).not.toBeInTheDocument();
  }
);

it.each([
  [false, false, 'access-level-form'],
  [false, true, 'read-only-access-form'],
  [true, false, 'authentication-form'],
  [true, true, 'read-only-access-form'],
])(
  'reacts to probe results with auth=%s and readOnly=%s',
  async (authRequired, readOnly, form) => {
    mockProbe.mockResolvedValue({ ...serverInfo, authRequired, readOnly });
    showLogin();
    expect(screen.getByTestId('login-loading')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit')).toBeDisabled();
    await finishProbe();
    expect(screen.getByTestId(form)).toBeInTheDocument();
    expect(screen.queryByTestId('login-loading')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'Ada' },
    });
    if (authRequired && !readOnly) {
      expect(screen.getByTestId('login-submit')).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'secret' },
      });
    }
    expect(screen.getByTestId('login-submit')).toBeEnabled();
  }
);

it('preserves shared credentials and access level when switching server forms', async () => {
  setTopicMapping(
    'SA1:first-host:12345;SA2:second-host:23456;SA3:third-host:34567'
  );
  mockProbe
    .mockResolvedValueOnce(serverInfo)
    .mockResolvedValueOnce({ ...serverInfo, authRequired: true })
    .mockResolvedValueOnce({ ...serverInfo, readOnly: true })
    .mockResolvedValueOnce({ ...serverInfo, authRequired: true })
    .mockResolvedValueOnce(serverInfo);
  showLogin();
  await finishProbe();
  fireEvent.change(screen.getByLabelText('Username'), {
    target: { value: 'Ada' },
  });
  selectOption('login-access-level', 'EXPERT');
  selectOption('login-topic', 'SA2');
  await finishProbe();
  expect(screen.getByLabelText('Username')).toHaveValue('Ada');
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'secret' },
  });
  selectOption('login-topic', 'SA3');
  await finishProbe();
  expect(screen.getByTestId('read-only-access-form')).toBeInTheDocument();
  expect(screen.getByLabelText('Username')).toHaveValue('Ada');
  selectOption('login-topic', 'SA2');
  await finishProbe();
  expect(screen.getByLabelText('Password')).toHaveValue('secret');
  selectOption('login-topic', 'SA1');
  await finishProbe();
  expect(screen.getByTestId('login-access-level')).toHaveTextContent('EXPERT');
  expect(screen.getByLabelText('Username')).toHaveValue('Ada');
});

it.each([false, true])(
  'logs in using shared fields for auth=%s',
  async (authRequired) => {
    setTopicMapping();
    config.lastTopic = 'SA2';
    mockProbe.mockResolvedValue({ ...serverInfo, authRequired });
    const session = {
      host: 'second-host',
      port: 23456,
      userId: 'Ada',
      accessLevel: 0,
      isReadOnly: false,
      topic: 'SERVER_TOPIC',
      serverVersion: '2.20',
    };
    startNonAuthSession.mockResolvedValue(session);
    startAuthSession.mockResolvedValue(session);
    showLogin();
    await finishProbe();
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'Ada' },
    });
    if (authRequired) {
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'secret' },
      });
    } else {
      selectOption('login-access-level', 'EXPERT');
    }
    fireEvent.click(screen.getByTestId('login-submit'));
    await finishProbe();
    if (authRequired) {
      expect(mockAuthenticate).toHaveBeenCalledWith({
        username: 'Ada',
        password: 'secret',
      });
      expect(startAuthSession).toHaveBeenCalledWith(
        'second-host',
        23456,
        'Ada',
        'once-token',
        'refresh-token',
        false
      );
    } else {
      expect(startNonAuthSession).toHaveBeenCalledWith(
        'second-host',
        23456,
        'Ada',
        2,
        false
      );
    }
    expect(useGlobalStore.getState().sessionInfo?.loggedUser).toBe('Ada');
  }
);

it.each(['Server unavailable', new Error('Server unavailable')])(
  'reports probe failures and clears them when a new topic is selected: %s',
  async (error) => {
    setTopicMapping();
    mockProbe.mockRejectedValueOnce(error).mockResolvedValueOnce(serverInfo);
    showLogin();
    await finishProbe();
    expect(screen.getByTestId('login-error')).toHaveTextContent(
      'Server unavailable'
    );
    expect(screen.getByTestId('login-submit')).toBeDisabled();
    selectOption('login-topic', 'SA2');
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
    await finishProbe();
    expect(screen.getByTestId('access-level-form')).toBeInTheDocument();
    expect(mockProbe).toHaveBeenCalledTimes(2);
  }
);

it.each([
  [false, false, 'Username'],
  [false, true, 'Username'],
  [true, false, 'Username'],
  [true, false, 'Password'],
] as const)(
  'clears login errors after editing %s/%s/%s without probing again',
  async (authRequired, readOnly, field) => {
    setTopicMapping();
    mockProbe.mockResolvedValue({ ...serverInfo, authRequired, readOnly });
    mockAuthenticate.mockResolvedValue({
      success: false,
      error_msg: 'Invalid credentials',
    });
    startNonAuthSession.mockRejectedValue(new Error('Connection refused'));
    showLogin();
    await finishProbe();
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'Ada' },
    });
    if (authRequired) {
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'secret' },
      });
    }
    fireEvent.click(screen.getByTestId('login-submit'));
    await finishProbe();
    expect(screen.getByTestId('login-error')).toHaveTextContent(
      authRequired
        ? 'Auth error: Invalid credentials'
        : 'Login error: Connection refused'
    );

    fireEvent.change(screen.getByLabelText(field), {
      target: { value: 'updated' },
    });
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
    expect(screen.getByLabelText(field)).toHaveValue('updated');
    await advanceTime(10_000);
    expect(mockProbe).toHaveBeenCalledTimes(1);
  }
);

it.each(['probe', 'login'])(
  'clears a %s error as soon as the host is edited',
  async (source) => {
    if (source === 'probe') {
      mockProbe.mockRejectedValueOnce(new Error('Server unavailable'));
    } else {
      startNonAuthSession.mockRejectedValue(new Error('Connection refused'));
    }
    showLogin();
    await finishProbe();
    if (source === 'login') {
      fireEvent.change(screen.getByLabelText('Username'), {
        target: { value: 'Ada' },
      });
      fireEvent.click(screen.getByTestId('login-submit'));
      await finishProbe();
    }
    expect(screen.getByTestId('login-error')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('login-host'), {
      target: { value: 'new-host' },
    });
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
    await advanceTime(1_999);
    expect(mockProbe).toHaveBeenCalledTimes(1);
    await advanceTime(1);
    expect(mockProbe).toHaveBeenCalledTimes(2);
    expect(mockProbe).toHaveBeenLastCalledWith('new-host', 44444);
    expect(screen.getByTestId('access-level-form')).toBeInTheDocument();
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
  }
);

it('clears a login error on topic selection and displays a subsequent probe failure', async () => {
  setTopicMapping();
  mockProbe
    .mockResolvedValueOnce(serverInfo)
    .mockRejectedValueOnce(new Error('New topic unavailable'));
  startNonAuthSession.mockRejectedValue(new Error('Connection refused'));
  showLogin();
  await finishProbe();
  fireEvent.change(screen.getByLabelText('Username'), {
    target: { value: 'Ada' },
  });
  fireEvent.click(screen.getByTestId('login-submit'));
  await finishProbe();
  expect(screen.getByTestId('login-error')).toHaveTextContent(
    'Login error: Connection refused'
  );

  selectOption('login-topic', 'SA2');
  expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
  await finishProbe();
  expect(screen.getByTestId('login-error')).toHaveTextContent(
    'New topic unavailable'
  );
  selectOption('login-topic', 'SA1');
  await finishProbe();
  expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
  expect(screen.getByTestId('access-level-form')).toBeInTheDocument();
  expect(mockProbe).toHaveBeenCalledTimes(3);
});

it('ignores a failure from an old form probe after a new probe succeeds', async () => {
  let rejectOldProbe!: (error: Error) => void;
  mockProbe.mockImplementationOnce(
    () =>
      new Promise<GuiServerInfo>((_resolve, reject) => {
        rejectOldProbe = reject;
      })
  );
  showLogin();
  act(() => setTopicMapping());
  await finishProbe();
  expect(screen.getByTestId('access-level-form')).toBeInTheDocument();

  await act(async () => {
    rejectOldProbe(new Error('Old server unavailable'));
  });
  expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
  expect(screen.getByTestId('access-level-form')).toBeInTheDocument();
  expect(mockProbe).toHaveBeenCalledTimes(2);
});

it('ignores an old form probe after the mapping changes', async () => {
  let resolveOldProbe!: (server: GuiServerInfo) => void;
  mockProbe.mockImplementationOnce(
    () =>
      new Promise<GuiServerInfo>((resolve) => {
        resolveOldProbe = resolve;
      })
  );
  showLogin();
  act(() => setTopicMapping());
  await finishProbe();
  expect(mockProbe).toHaveBeenCalledTimes(2);
  await act(async () => {
    resolveOldProbe({ ...serverInfo, authRequired: true });
  });
  expect(screen.getByTestId('access-level-form')).toBeInTheDocument();
  expect(screen.queryByTestId('authentication-form')).not.toBeInTheDocument();
});

it('falls back to HostPortForm when the mapping has no decoded topics', () => {
  setTopicMapping('invalid-entry');
  showLogin();
  expect(screen.getByTestId('host-port-form')).toBeInTheDocument();
  expect(mockProbe).toHaveBeenCalledWith('saved-host', 44444);
});
