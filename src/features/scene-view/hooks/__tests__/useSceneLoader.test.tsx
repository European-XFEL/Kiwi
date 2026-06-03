import { act, renderHook, waitFor } from '@testing-library/react';

const mockGetScene = jest.fn();
const mockSetRecentScene = jest.fn();
const mockSetLoadedSceneRef = jest.fn();

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
  useLoadedSceneStore: () => ({
    setLoadedSceneRef: mockSetLoadedSceneRef,
  }),
}));

import { useSceneLoader } from '../useSceneLoader';

const makeSceneResult = (uuid: string) => ({
  error_msg: '',
  model: {
    width: uuid === 'scene-a' ? 800 : 1024,
    height: uuid === 'scene-a' ? 600 : 768,
    uuid: `model-${uuid}`,
  },
  scene: {
    domain: 'CONTROLS',
    projectName: 'David_test',
    uuid,
    name: `name-${uuid}`,
  },
});

describe('useSceneLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const { result, rerender } = renderHook(() => useSceneLoader());

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
    expect(mockSetLoadedSceneRef).toHaveBeenCalledTimes(1);

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
    expect(mockSetLoadedSceneRef).toHaveBeenCalledTimes(2);
    expect(mockSetLoadedSceneRef).toHaveBeenLastCalledWith({
      width: 1024,
      height: 768,
      domain: 'CONTROLS',
      projectName: 'David_test',
      uuid: 'scene-b',
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

    const { result } = renderHook(() => useSceneLoader());

    await waitFor(() => {
      expect(result.current.error).toContain('backend down');
    });

    expect(mockSetLoadedSceneRef).toHaveBeenCalledWith(undefined);
    expect(result.current.scene).toBeNull();
  });
});
