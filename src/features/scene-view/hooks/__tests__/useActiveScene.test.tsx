import { act, renderHook, waitFor } from '@testing-library/react';

const mockGetScene = jest.fn();
const mockSetRecentScene = jest.fn();

let mockLocationSearch =
  '?host=test-host&port=44444&domain=CONTROLS&projectName=David_test&uuid=scene-a';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ search: mockLocationSearch }),
}));

jest.mock('@/lib/singletons/api', () => ({
  getDbConn: () => ({ getScene: mockGetScene }),
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

const makeSceneResult = (uuid: string) => ({
  error_msg: '',
  sceneModel: {
    width: uuid === 'scene-a' ? 800 : 1024,
    height: uuid === 'scene-a' ? 600 : 768,
    uuid: `model-${uuid}`,
    simple_name: `name-${uuid}`,
  },
});

describe('useActiveScene', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useActiveSceneStore.setState({
      loadedSceneRef: undefined,
      fitMode: 'fit-page',
    });
    mockLocationSearch =
      '?host=test-host&port=44444&domain=CONTROLS&projectName=David_test&uuid=scene-a';

    mockGetScene.mockImplementation(
      (
        _domain: string,
        _projectName: string,
        uuid: string,
        onScene: (result: any) => void
      ) => {
        onScene(makeSceneResult(uuid));
      }
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
      'David_test',
      'scene-a',
      expect.any(Function)
    );
    expect(useActiveSceneStore.getState().loadedSceneRef).toEqual(
      expect.objectContaining({ uuid: 'model-scene-a' })
    );

    mockLocationSearch =
      '?host=test-host&port=44444&domain=CONTROLS&projectName=David_test&uuid=scene-b';

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
      'David_test',
      'scene-b',
      expect.any(Function)
    );
    expect(useActiveSceneStore.getState().loadedSceneRef).toEqual({
      width: 1024,
      height: 768,
      domain: 'CONTROLS',
      projectName: 'David_test',
      uuid: 'model-scene-b',
      name: 'name-scene-b',
    });
  });

  it('clears shared scene metadata when loading fails', async () => {
    mockGetScene.mockImplementation(
      (
        _domain: string,
        _projectName: string,
        _uuid: string,
        onScene: (result: any) => void
      ) => {
        onScene({ error_msg: 'backend down' });
      }
    );

    const { result } = renderHook(() => useActiveScene());

    await waitFor(() => {
      expect(result.current.error).toContain('backend down');
    });

    expect(useActiveSceneStore.getState().loadedSceneRef).toBeUndefined();
    expect(result.current.scene).toBeNull();
  });
});
