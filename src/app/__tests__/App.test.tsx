import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import App from '../App';

const mockResume = jest.fn();
const mockSetLoggedOut = jest.fn();
const mockSetSetting = jest.fn();
const mockSetSession = jest.fn();

jest.mock('@/features/controllers/api', () => ({
  bootstrapStatefulIcons: jest.fn(),
}));
jest.mock('../AppSettings', () => ({
  initAppSettings: () => ({ wsProxyURL: '', topicGuiServerMapping: '' }),
}));
jest.mock('../hooks/useSessionCleanup', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@/lib/events', () => ({
  KaraboEvent: {},
  useKaraboEvent: jest.fn(),
}));
jest.mock('@/lib/singletons/api', () => ({
  getConfig: () => ({ lastHost: 'saved-host', lastPort: 44444 }),
  getManager: jest.fn(),
  getNetwork: () => ({ resumeGuiSession: mockResume }),
}));
jest.mock('@/store/api', () => ({
  useAppSettingsStore: () => ({
    setWsProxyUrl: mockSetSetting,
    setTopicGuiServerMapping: mockSetSetting,
  }),
  useGlobalStore: () => ({
    setError: mockSetSession,
    setLoggedIn: mockSetSession,
    setNotifiedSessionExpiration: mockSetSession,
    setSessionExpired: mockSetSession,
    setLoggedOut: mockSetLoggedOut,
  }),
}));
jest.mock('@/components/api', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => children,
  Toaster: () => null,
}));

it('resumes the saved server regardless of legacy scene query parameters', async () => {
  mockResume.mockResolvedValue(undefined);
  render(
    <MemoryRouter
      initialEntries={[
        '/main?host=old-host&port=12345&domain=OLD&projectUuid=old-project&sceneUuid=old-scene',
      ]}
    >
      <App />
    </MemoryRouter>
  );

  await waitFor(() =>
    expect(mockResume).toHaveBeenCalledWith('saved-host', 44444)
  );
  expect(mockSetLoggedOut).toHaveBeenCalled();
});
