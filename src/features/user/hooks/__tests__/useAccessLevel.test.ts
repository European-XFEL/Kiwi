import { act, renderHook } from '@testing-library/react';
import { AccessLevel } from '@/karabo/data/api';
import { useGlobalStore } from '@/store/api';
import { AccessControlManager } from '../../utils/AccessLevel';
import { useAccessLevel } from '../useAccessLevel';

const mockLoadSession = jest.fn();
const mockSaveNonAuthSession = jest.fn();

jest.mock('@/lib/singletons/api', () => ({
  getConfig: () => ({
    loadSession: mockLoadSession,
    saveNonAuthSession: mockSaveNonAuthSession,
  }),
}));

function login(accessLevel: AccessLevel) {
  AccessControlManager.instance.initFromLogin({
    accessLevel,
    isAuthenticated: false,
  });
  useGlobalStore.getState().setLoggedIn({
    loggedUser: 'test-user',
    accessLevel,
    isReadOnly: false,
    guiServerHost: 'host-a',
    guiServerPort: 44444,
    guiServerTopic: 'TOPIC_A',
    guiServerVersion: '2.20.0',
    sessionStartEpoc: 1700000000000,
  });
}

describe('useAccessLevel.changeLevel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadSession.mockResolvedValue({});
  });

  afterEach(() => {
    useGlobalStore.getState().reset();
  });

  it('switches the level and saves it for a non-auth session', async () => {
    login(AccessLevel.EXPERT);
    const { result } = renderHook(() => useAccessLevel());

    await act(() => result.current.changeLevel(AccessLevel.OPERATOR));

    expect(useGlobalStore.getState().sessionInfo?.accessLevel).toBe(
      AccessLevel.OPERATOR
    );
    expect(mockSaveNonAuthSession).toHaveBeenCalledWith(
      'test-user',
      AccessLevel.OPERATOR
    );
  });

  it('does not save the level of an auth session', async () => {
    login(AccessLevel.EXPERT);
    mockLoadSession.mockResolvedValue({ refreshToken: 'token' });
    const { result } = renderHook(() => useAccessLevel());

    await act(() => result.current.changeLevel(AccessLevel.OPERATOR));

    expect(useGlobalStore.getState().sessionInfo?.accessLevel).toBe(
      AccessLevel.OPERATOR
    );
    expect(mockSaveNonAuthSession).not.toHaveBeenCalled();
  });

  it('refuses a level the user cannot switch to', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    login(AccessLevel.OBSERVER);
    const { result } = renderHook(() => useAccessLevel());

    await act(() => result.current.changeLevel(AccessLevel.EXPERT));

    expect(useGlobalStore.getState().sessionInfo?.accessLevel).toBe(
      AccessLevel.OBSERVER
    );
    expect(mockSaveNonAuthSession).not.toHaveBeenCalled();
  });
});
