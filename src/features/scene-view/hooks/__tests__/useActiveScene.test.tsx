import { act, renderHook, waitFor } from '@testing-library/react';

const mockGetScene = jest.fn();
const mockSetRecentScene = jest.fn();

let mockLocationSearch =
  '?host=test-host&port=44444&domain=CONTROLS&projectUuid=project-1&sceneUuid=scene-a';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ search: mockLocationSearch }),
}));

jest.mock('@/lib/singletons/api', () => ({
  getDbConn: () => ({ getScene: mockGetScene }),
  getProjectModel: () => ({
    root: { simple_name: 'David_test' },
  }),
  getTopology: () => ({ initialized: true }),
}));

jest.mock('@/store/api', () => ({
  useGlobalStore: () => ({
    sessionInfo: {
      loggedUser: 'test-user',
    },
  }),
  useRecentStore: () => ({
    setRecentScene: mockSetRecentScene,
  }),
}));

import { useActiveScene, useActiveSceneStore } from '../useActiveScene';

const makeSceneModel = (uuid: string) => ({
  width: uuid === 'scene-a' ? 800 : 1024,
  height: uuid === 'scene-a' ? 600 : 768,
  uuid: `model-${uuid}`,
  simple_name: `name-${uuid}`,
});

describe('useActiveScene', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useActiveSceneStore.setState({
      loadedSceneRef: undefined,
      fitMode: 'fit-page',
    });
    mockLocationSearch =
      '?host=test-host&port=44444&domain=CONTROLS&projectUuid=project-1&sceneUuid=scene-a';

    mockGetScene.mockImplementation(
      (_domain: string, _projectUuid: string, uuid: string) =>
        makeSceneModel(uuid)
    );
  });

  it('loads one new scene once when the URL scene changes', async () => {
    const { result, rerender } = renderHook(() => useActiveScene());

    await waitFor(() => {
      expect(result.current.scene).toEqual(
        expect.objectContaining({ uuid: 'model-scene-a' })
      );
    });

    expect(mockGetScene).toHaveBeenCalledTimes(1);
    expect(mockGetScene).toHaveBeenLastCalledWith(
      'CONTROLS',
      'project-1',
      'scene-a'
    );
    expect(useActiveSceneStore.getState().loadedSceneRef).toEqual(
      expect.objectContaining({ uuid: 'model-scene-a' })
    );

    mockLocationSearch =
      '?host=test-host&port=44444&domain=CONTROLS&projectUuid=project-2&sceneUuid=scene-b';

    act(() => {
      rerender();
    });

    await waitFor(() => {
      expect(result.current.scene).toEqual(
        expect.objectContaining({ uuid: 'model-scene-b' })
      );
    });

    expect(mockGetScene).toHaveBeenCalledTimes(2);
    expect(mockGetScene).toHaveBeenLastCalledWith(
      'CONTROLS',
      'project-2',
      'scene-b'
    );
    expect(useActiveSceneStore.getState().loadedSceneRef).toEqual({
      width: 1024,
      height: 768,
      domain: 'CONTROLS',
      projectUuid: 'project-2',
      projectName: 'David_test',
      uuid: 'model-scene-b',
      name: 'name-scene-b',
    });
  });

  it('clears shared scene metadata when loading fails', async () => {
    mockGetScene.mockImplementation(() => {
      throw new Error('backend down');
    });

    const { result } = renderHook(() => useActiveScene());

    await waitFor(() => {
      expect(result.current.error).toContain('backend down');
    });

    expect(useActiveSceneStore.getState().loadedSceneRef).toBeUndefined();
    expect(result.current.scene).toBeNull();
  });
});
