import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../useAuth';
import { useServerProbe } from '../useServerProbe';

const legacyURL =
  '/main?host=old-host&port=12345&domain=OLD&projectUuid=old-project&sceneUuid=old-scene';
const mockConfig = { lastHost: 'saved-host', lastPort: 44444 };
const mockProbeServer = jest.fn();
const mockStartSession = jest.fn();
const mockSetLoggedIn = jest.fn();

jest.mock('../../utils', () => ({
  probeServer: (...args: unknown[]) => mockProbeServer(...args),
}));
jest.mock('@/lib/singletons/api', () => ({
  getConfig: () => mockConfig,
  getNetwork: () => ({ startNonAuthSession: mockStartSession }),
}));
jest.mock('@/store/api', () => ({
  useGlobalStore: (
    select: (state: { setLoggedIn: typeof mockSetLoggedIn }) => unknown
  ) => select({ setLoggedIn: mockSetLoggedIn }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={[legacyURL]}>{children}</MemoryRouter>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockProbeServer.mockImplementation(() => new Promise(() => {}));
  mockConfig.lastHost = 'saved-host';
  mockConfig.lastPort = 44444;
});

it('probes the saved server instead of the host and port from an old scene URL', async () => {
  const { result } = renderHook(() => useServerProbe({ debounceMs: 1000 }), {
    wrapper: Wrapper,
  });

  await waitFor(() =>
    expect(mockProbeServer).toHaveBeenCalledWith('saved-host', 44444)
  );
  expect(result.current.host).toBe('saved-host');
  expect(result.current.port).toBe('44444');
});

it('finishes login at main without retaining the old scene query', async () => {
  mockStartSession.mockResolvedValue({
    host: 'saved-host',
    port: 44444,
    userId: 'user',
    accessLevel: 1,
    isReadOnly: false,
    topic: 'TOPIC',
    serverVersion: '2.20.0',
  });
  const { result } = renderHook(
    () => ({
      auth: useAuth({
        probedServerInfo: null,
        setActivityStatus: jest.fn(),
        setErrorMessage: jest.fn(),
      }),
      location: useLocation(),
    }),
    { wrapper: Wrapper }
  );

  await act(async () => result.current.auth.doLogin('saved-host', '44444'));

  expect(mockSetLoggedIn).toHaveBeenCalled();
  expect(result.current.location.pathname).toBe('/main');
  expect(result.current.location.search).toBe('');
});
