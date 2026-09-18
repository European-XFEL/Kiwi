import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import SceneBootstrap from '../SceneBootstrap';
import { loadRootProjectFromBookmark } from '@/features/project/api';
import { useActiveSceneStore } from '@/features/scene-view/hooks/useActiveScene';

jest.mock('@/features/project/api', () => ({
  loadRootProjectFromBookmark: jest.fn(() => ({
    controller: new AbortController(),
    promise: new Promise(() => {}),
    abort: jest.fn(),
  })),
}));

const mockTopology = { initialized: true };
const mockPanelWrangler = {
  getSavedActiveTab: jest.fn(),
  clearSavedActiveTab: jest.fn(),
};

jest.mock('@/lib/singletons/api', () => ({
  getTopology: () => mockTopology,
  getPanelWrangler: () => mockPanelWrangler,
}));

const loadRootProjectFromBookmarkMock =
  loadRootProjectFromBookmark as jest.Mock;

const savedTab = {
  host: 'host-a',
  port: 44444,
  domain: 'CONTROLS',
  projectUuid: 'project-a',
  sceneUuid: 'scene-a',
};

describe('SceneBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTopology.initialized = true;
    mockPanelWrangler.getSavedActiveTab.mockReturnValue(savedTab);
    useActiveSceneStore.setState({ sceneLoadPending: false });
  });

  it('restores the saved tab once after StrictMode reruns the bootstrap effect', async () => {
    render(
      <React.StrictMode>
        <MemoryRouter initialEntries={['/main']}>
          <SceneBootstrap />
        </MemoryRouter>
      </React.StrictMode>
    );

    await waitFor(() =>
      expect(loadRootProjectFromBookmarkMock).toHaveBeenCalledTimes(1)
    );
    expect(loadRootProjectFromBookmarkMock).toHaveBeenCalledWith(savedTab);
  });

  it('marks the workspace as pending while the saved tab loads', async () => {
    render(
      <MemoryRouter initialEntries={['/main']}>
        <SceneBootstrap />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(useActiveSceneStore.getState().sceneLoadPending).toBe(true);
    });
  });

  it('waits for topology before restoring the saved tab', async () => {
    jest.useFakeTimers();
    mockTopology.initialized = false;

    render(
      <MemoryRouter initialEntries={['/main']}>
        <SceneBootstrap />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(useActiveSceneStore.getState().sceneLoadPending).toBe(true);
    });
    expect(loadRootProjectFromBookmarkMock).not.toHaveBeenCalled();

    await act(async () => {
      mockTopology.initialized = true;
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(loadRootProjectFromBookmarkMock).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  it('stays at Home without a saved tab, even when the URL names a scene', () => {
    mockPanelWrangler.getSavedActiveTab.mockReturnValue(undefined);

    render(
      <MemoryRouter
        initialEntries={[
          '/main?host=host-a&port=44444&domain=CONTROLS&projectUuid=project-a&sceneUuid=scene-a',
        ]}
      >
        <SceneBootstrap />
      </MemoryRouter>
    );

    expect(loadRootProjectFromBookmarkMock).not.toHaveBeenCalled();
    expect(useActiveSceneStore.getState().sceneLoadPending).toBe(false);
  });

  it('does not restore the saved tab again after returning Home', async () => {
    const user = userEvent.setup();
    loadRootProjectFromBookmarkMock.mockReturnValueOnce({
      controller: new AbortController(),
      promise: Promise.resolve(),
      abort: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/main']}>
        <SceneBootstrap />
        <Link to="/main">Home</Link>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(loadRootProjectFromBookmarkMock).toHaveBeenCalledTimes(1);
      expect(useActiveSceneStore.getState().sceneLoadPending).toBe(false);
    });
    await user.click(screen.getByRole('link', { name: 'Home' }));

    expect(loadRootProjectFromBookmarkMock).toHaveBeenCalledTimes(1);
  });

  it('forgets a saved tab that fails to load so the next reload starts at Home', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    loadRootProjectFromBookmarkMock.mockReturnValueOnce({
      controller: new AbortController(),
      promise: Promise.reject(new Error('scene missing')),
      abort: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/main']}>
        <SceneBootstrap />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockPanelWrangler.clearSavedActiveTab).toHaveBeenCalledTimes(1);
      expect(useActiveSceneStore.getState().sceneLoadPending).toBe(false);
    });
    consoleError.mockRestore();
  });
});
