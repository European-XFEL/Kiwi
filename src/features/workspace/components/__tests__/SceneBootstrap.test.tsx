import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import SceneBootstrap from '../SceneBootstrap';
import { startSceneFromRoute } from '@/features/project/api';
import { useActiveSceneStore } from '@/features/scene-view/hooks/useActiveScene';

jest.mock('@/features/project/api', () => ({
  startSceneFromRoute: jest.fn(() => ({
    controller: new AbortController(),
    promise: new Promise(() => {}),
    abort: jest.fn(),
  })),
}));

const mockTopology = { initialized: true };

jest.mock('@/lib/singletons/api', () => ({
  getTopology: () => mockTopology,
}));

const startSceneFromRouteMock = startSceneFromRoute as jest.Mock;

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
      expect(startSceneFromRouteMock).toHaveBeenCalledTimes(1)
    );

    const params = startSceneFromRouteMock.mock.calls[0][0];
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
    expect(startSceneFromRouteMock).not.toHaveBeenCalled();

    await act(async () => {
      mockTopology.initialized = true;
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(startSceneFromRouteMock).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  it('clears broken scene params from the url when route loading fails', async () => {
    startSceneFromRouteMock.mockReturnValueOnce({
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
