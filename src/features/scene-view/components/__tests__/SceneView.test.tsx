import React from 'react';
import { act, render } from '@testing-library/react';
import SceneView from '../SceneView';

// Prefixed with "mock" so Jest allows them inside the mock factory below.
const mockWidgetMountSpy = jest.fn();
const mockWidgetUnmountSpy = jest.fn();
const mockShapeMountSpy = jest.fn();
const mockShapeUnmountSpy = jest.fn();

// ElementRenderer is mocked to components that track phase mount/unmount.
// Written without JSX so the factory doesn't reference the hoisted jsx_runtime.
jest.mock('../../render/ElementRenderer', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  function LifecycleTracker({ phase }: { phase: 'shape' | 'widget' }) {
    ReactActual.useEffect(() => {
      if (phase === 'widget') {
        mockWidgetMountSpy();
      } else {
        mockShapeMountSpy();
      }

      return () => {
        if (phase === 'widget') {
          mockWidgetUnmountSpy();
        } else {
          mockShapeUnmountSpy();
        }
      };
    }, [phase]);
    return null;
  }

  return {
    ElementRenderer: function MockElementRenderer({
      phase,
    }: {
      phase: 'shape' | 'widget';
    }) {
      return ReactActual.createElement(LifecycleTracker, { phase });
    },
  };
});

// Bootstrap side-effect import
jest.mock('../../renderers', () => ({}));

jest.mock('../../hooks/useSceneLoader');
jest.mock('../../hooks/useSceneScale');
jest.mock('@/store/globalAppStateStore');
jest.mock('@/store/loadedSceneStore');

import { useSceneLoader } from '../../hooks/useSceneLoader';
import { useSceneScale } from '../../hooks/useSceneScale';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { useLoadedSceneStore } from '@/store/loadedSceneStore';

const mockUseSceneLoader = jest.mocked(useSceneLoader);
const mockUseSceneScale = jest.mocked(useSceneScale);
const mockUseGlobalStore = jest.mocked(useGlobalStore);
const mockUseLoadedSceneStore = jest.mocked(useLoadedSceneStore);

function makeScene(uuid: string) {
  return {
    uuid,
    width: 800,
    height: 600,
    children: [{}],
  } as any;
}

describe('SceneView — scene uuid keying', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSceneScale.mockReturnValue(1);
    mockUseGlobalStore.mockReturnValue({ lastGlobalError: null } as any);
    mockUseLoadedSceneStore.mockReturnValue({ fitMode: 'fit-page' } as any);
  });

  it('unmounts and remounts the widget subtree when the scene uuid changes', () => {
    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-1'),
      error: '',
    });

    const { rerender } = render(<SceneView />);

    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(0);

    // Same scene uuid, fresh scene object — no remount expected
    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-1'),
      error: '',
    });

    act(() => {
      rerender(<SceneView />);
    });

    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(0);

    // Different uuid — SceneStage key changes → full unmount + remount
    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-2'),
      error: '',
    });

    act(() => {
      rerender(<SceneView />);
    });

    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(2);
  });

  it('unmounts and remounts the shape subtree when the scene uuid changes', () => {
    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-1'),
      error: '',
    });

    const { rerender } = render(<SceneView />);

    expect(mockShapeMountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(0);

    // Same scene uuid, fresh scene object — no remount expected
    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-1'),
      error: '',
    });

    act(() => {
      rerender(<SceneView />);
    });

    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(0);

    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-2'),
      error: '',
    });

    act(() => {
      rerender(<SceneView />);
    });

    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeMountSpy).toHaveBeenCalledTimes(2);
  });

  it('unmounts and remounts the whole rendered scene subtree when the scene uuid changes', () => {
    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-1'),
      error: '',
    });

    const { rerender } = render(<SceneView />);

    expect(mockShapeMountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(0);
    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(0);

    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-2'),
      error: '',
    });

    act(() => {
      rerender(<SceneView />);
    });

    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeMountSpy).toHaveBeenCalledTimes(2);
    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(2);
  });
});
