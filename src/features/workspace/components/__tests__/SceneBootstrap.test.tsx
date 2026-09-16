import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
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

jest.mock('@/lib/singletons/api', () => ({
  getTopology: () => mockTopology,
}));

const loadRootProjectFromBookmarkMock =
  loadRootProjectFromBookmark as jest.Mock;

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location-probe">
      {location.pathname}
      {location.search}
    </div>
  );
}

describe('SceneBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTopology.initialized = true;
    useActiveSceneStore.setState({ sceneLoadPending: false });
  });

  it('loads the bookmarked scene once after StrictMode reruns the bootstrap effect', async () => {
    render(
      <React.StrictMode>
        <MemoryRouter
          initialEntries={[
            '/main?host=host-a&port=44444&domain=CONTROLS&projectUuid=project-a&sceneUuid=scene-a',
          ]}
        >
          <SceneBootstrap />
        </MemoryRouter>
      </React.StrictMode>
    );

    await waitFor(() =>
      expect(loadRootProjectFromBookmarkMock).toHaveBeenCalledTimes(1)
    );

    const params = loadRootProjectFromBookmarkMock.mock.calls[0][0];
    expect(params.sceneUuid).toBe('scene-a');
  });

  it('marks the scene route as pending while loading', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/main?host=host-a&port=44444&domain=CONTROLS&projectUuid=project-a&sceneUuid=scene-a',
        ]}
      >
        <SceneBootstrap />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(useActiveSceneStore.getState().sceneLoadPending).toBe(true);
    });
  });

  it('waits for topology before loading a bookmarked scene route', async () => {
    jest.useFakeTimers();
    mockTopology.initialized = false;

    render(
      <MemoryRouter
        initialEntries={[
          '/main?host=host-a&port=44444&domain=CONTROLS&projectUuid=project-a&sceneUuid=scene-a',
        ]}
      >
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

  it('ignores obsolete root parameters when identifying the same bookmark', async () => {
    const user = userEvent.setup();
    const sceneRoute =
      '/main?host=host-a&port=44444&domain=CONTROLS&projectUuid=shared&sceneUuid=scene-a';
    loadRootProjectFromBookmarkMock.mockReturnValueOnce({
      controller: new AbortController(),
      promise: Promise.resolve(),
      abort: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={[`${sceneRoute}&rootProjectUuid=root-a`]}>
        <SceneBootstrap />
        <Link to={`${sceneRoute}&rootProjectUuid=root-b`}>Other root</Link>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(loadRootProjectFromBookmarkMock).toHaveBeenCalledTimes(1);
      expect(useActiveSceneStore.getState().sceneLoadPending).toBe(false);
    });
    await user.click(screen.getByRole('link', { name: 'Other root' }));

    expect(loadRootProjectFromBookmarkMock).toHaveBeenCalledTimes(1);
    expect(loadRootProjectFromBookmarkMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projectUuid: 'shared',
        sceneUuid: 'scene-a',
      })
    );
  });

  it('reloads the same bookmark after returning home', async () => {
    const user = userEvent.setup();
    const sceneRoute =
      '/main?host=host-a&port=44444&domain=CONTROLS&projectUuid=motors&sceneUuid=motor-scene';
    loadRootProjectFromBookmarkMock.mockReturnValueOnce({
      controller: new AbortController(),
      promise: Promise.resolve(),
      abort: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={[sceneRoute]}>
        <SceneBootstrap />
        <Link to="/main">Home</Link>
        <Link to={sceneRoute}>Bookmarked scene</Link>
        <LocationProbe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(loadRootProjectFromBookmarkMock).toHaveBeenCalledTimes(1);
      expect(useActiveSceneStore.getState().sceneLoadPending).toBe(false);
    });
    await user.click(screen.getByRole('link', { name: 'Home' }));
    expect(screen.getByTestId('location-probe').textContent).toBe('/main');

    await user.click(screen.getByRole('link', { name: 'Bookmarked scene' }));

    await waitFor(() =>
      expect(loadRootProjectFromBookmarkMock).toHaveBeenCalledTimes(2)
    );
    expect(loadRootProjectFromBookmarkMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projectUuid: 'motors',
        sceneUuid: 'motor-scene',
      })
    );
  });

  it('clears broken scene params from the url when route loading fails', async () => {
    loadRootProjectFromBookmarkMock.mockReturnValueOnce({
      controller: new AbortController(),
      promise: Promise.reject(new Error('scene missing')),
      abort: jest.fn(),
    });

    render(
      <MemoryRouter
        initialEntries={[
          '/main?host=host-a&port=44444&domain=CONTROLS&projectUuid=project-a&sceneUuid=scene-a',
        ]}
      >
        <SceneBootstrap />
        <LocationProbe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/main');
      expect(screen.getByTestId('location-probe')).not.toHaveTextContent(
        'sceneUuid=scene-a'
      );
      expect(screen.getByTestId('location-probe')).not.toHaveTextContent(
        'projectUuid=project-a'
      );
    });
  });
});
