import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getPanelWrangler, singletons } from '@/lib/singletons/api';
import { useGlobalActivityStore, useGlobalStore } from '@/store/api';
import WorkspacePage from '../WorkspacePage';

jest.mock('@/features/scenepanel/api', () => ({ ScenePanel: () => null }));
jest.mock('@/app/HomePanel', () => ({ __esModule: true, default: () => null }));

const mockHeader = jest.fn(() => null);
const mockBody = jest.fn(() => null);

jest.mock('../components/WorkspaceHeader', () => ({
  __esModule: true,
  default: () => mockHeader(),
}));
jest.mock('../components/WorkspaceBody', () => ({
  __esModule: true,
  default: () => mockBody(),
}));
jest.mock('../components/SceneBootstrap', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../components/WorkspaceFooter', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: ({ runtime }: { runtime: unknown }) =>
      React.createElement(
        'output',
        { 'data-testid': 'footer-status' },
        JSON.stringify(runtime)
      ),
  };
});

function footerStatus() {
  return JSON.parse(screen.getByTestId('footer-status').textContent!);
}

describe('workspace footer status updates', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useGlobalActivityStore.setState({
      lastActivity: null,
      activityLevel: 'idle',
      latestLatency: null,
      queuedMessageCount: 0,
    });
    useGlobalStore.getState().setLoggedIn({
      loggedUser: 'test-user',
      accessLevel: 4,
      isReadOnly: false,
      guiServerHost: 'host-a',
      guiServerPort: 44444,
      guiServerTopic: 'TOPIC_A',
      guiServerVersion: '2.20.0',
      sessionStartEpoc: Date.now(),
    });
  });

  afterEach(() => {
    cleanup();
    getPanelWrangler().dispose();
    singletons.delete('panel_wrangler');
    useGlobalStore.getState().reset();
    useGlobalActivityStore.getState().reset();
    jest.useRealTimers();
  });

  it('updates elapsed time without rerendering the header or scene body', () => {
    render(
      <MemoryRouter>
        <WorkspacePage />
      </MemoryRouter>
    );
    expect(footerStatus().connectedFor).toBe('00s');
    mockHeader.mockClear();
    mockBody.mockClear();

    act(() => jest.advanceTimersByTime(1000));

    expect(footerStatus().connectedFor).toBe('01s');
    expect(mockHeader).not.toHaveBeenCalled();
    expect(mockBody).not.toHaveBeenCalled();
  });

  it('updates latency and queue independently of the header and scene body', () => {
    render(
      <MemoryRouter>
        <WorkspacePage />
      </MemoryRouter>
    );
    expect(footerStatus().latestLatency).toBeNull();
    mockHeader.mockClear();
    mockBody.mockClear();

    act(() =>
      useGlobalActivityStore.setState({
        latestLatency: 0.125,
        queuedMessageCount: 3,
      })
    );

    expect(footerStatus()).toMatchObject({
      latestLatency: 0.125,
      queuedMessageCount: 3,
    });
    expect(mockHeader).not.toHaveBeenCalled();
    expect(mockBody).not.toHaveBeenCalled();
  });

  it('resets the elapsed time for a new session and stops ticking on unmount', () => {
    const { unmount } = render(
      <MemoryRouter>
        <WorkspacePage />
      </MemoryRouter>
    );
    act(() => jest.advanceTimersByTime(5000));
    expect(footerStatus().connectedFor).toBe('05s');

    act(() =>
      useGlobalStore.getState().setLoggedIn({
        ...useGlobalStore.getState().sessionInfo!,
        sessionStartEpoc: Date.now(),
      })
    );
    expect(footerStatus().connectedFor).toBe('00s');
    act(() => useGlobalStore.getState().setLoggedOut());
    expect(footerStatus().connected).toBe(false);
    expect(footerStatus().connectedFor).toBeUndefined();

    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
