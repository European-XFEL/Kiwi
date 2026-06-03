import React from 'react';
import { act, render } from '@testing-library/react';
import {
  BoxLayoutModel,
  Direction,
  DisplayLabelModel,
  RectangleModel,
} from '@/karabo/common/api';
import SceneView from '../SceneView';

// Prefixed with "mock" so Jest allows them inside the mock factory below.
const mockWidgetMountSpy = jest.fn();
const mockWidgetUnmountSpy = jest.fn();
const mockShapeMountSpy = jest.fn();
const mockShapeUnmountSpy = jest.fn();
const mockRenderedEntries: Array<{ layer: 'shape' | 'widget'; kind: string }> =
  [];

// KaraboSceneWidget is mocked to components that track layer mount/unmount.
// Written without JSX so the factory doesn't reference the hoisted jsx_runtime.
jest.mock('../../KaraboSceneWidget', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  function LifecycleTracker({ layer }: { layer: 'shape' | 'widget' }) {
    ReactActual.useEffect(() => {
      if (layer === 'widget') {
        mockWidgetMountSpy();
      } else {
        mockShapeMountSpy();
      }

      return () => {
        if (layer === 'widget') {
          mockWidgetUnmountSpy();
        } else {
          mockShapeUnmountSpy();
        }
      };
    }, [layer]);
    return ReactActual.createElement('div', { 'data-layer': layer });
  }

  return {
    KaraboSceneWidget: function MockKaraboSceneWidget({
      layer,
      model,
    }: {
      layer: 'shape' | 'widget';
      model: { constructor: { name: string } };
    }) {
      mockRenderedEntries.push({ layer, kind: model.constructor.name });
      return ReactActual.createElement(LifecycleTracker, { layer });
    },
  };
});

// Bootstrap side-effect import
jest.mock('../../renderers', () => ({}));

jest.mock('../../hooks/useSceneScale');
jest.mock('@/store/api');

import { useSceneScale } from '../../hooks/useSceneScale';
import { useLoadedSceneStore } from '@/store/api';

const mockUseSceneScale = jest.mocked(useSceneScale);
const mockUseLoadedSceneStore = jest.mocked(useLoadedSceneStore);

function makeShapeChild() {
  const shape = new RectangleModel();
  shape.width = 10;
  shape.height = 10;
  return shape;
}

function makeWidgetChild() {
  const widget = new DisplayLabelModel();
  widget.width = 10;
  widget.height = 10;
  return widget;
}

function makeLayoutChild() {
  const layout = new BoxLayoutModel();
  layout.direction = Direction.LeftToRight;
  layout.children = [makeShapeChild(), makeWidgetChild()];
  return layout;
}

function makeScene(uuid: string, children: unknown[]) {
  return {
    uuid,
    width: 800,
    height: 600,
    children,
  } as any;
}

describe('SceneView — scene uuid keying', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderedEntries.length = 0;
    mockUseSceneScale.mockReturnValue(1);
    mockUseLoadedSceneStore.mockReturnValue({
      fitMode: 'fit-page',
      loadedSceneRef: undefined,
    } as any);
  });

  it('renders root layers as shape pass first, then widget pass, while preserving order within each layer', () => {
    render(
      <SceneView
        sceneModel={makeScene('scene-1', [
          makeWidgetChild(),
          makeShapeChild(),
          makeWidgetChild(),
          makeShapeChild(),
        ])}
      />
    );

    expect(mockRenderedEntries).toEqual([
      { layer: 'shape', kind: 'RectangleModel' },
      { layer: 'shape', kind: 'RectangleModel' },
      { layer: 'widget', kind: 'DisplayLabelModel' },
      { layer: 'widget', kind: 'DisplayLabelModel' },
    ]);
  });

  it('renders layout roots in both passes without interleaving the root layer order', () => {
    render(
      <SceneView
        sceneModel={makeScene('scene-1', [
          makeWidgetChild(),
          makeLayoutChild(),
          makeShapeChild(),
        ])}
      />
    );

    expect(mockRenderedEntries).toEqual([
      { layer: 'shape', kind: 'BoxLayoutModel' },
      { layer: 'shape', kind: 'RectangleModel' },
      { layer: 'widget', kind: 'DisplayLabelModel' },
      { layer: 'widget', kind: 'BoxLayoutModel' },
    ]);
  });

  it('unmounts and remounts the widget subtree when the scene uuid changes', () => {
    const { rerender } = render(
      <SceneView sceneModel={makeScene('scene-1', [makeWidgetChild()])} />
    );

    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(0);

    // Same scene uuid, fresh scene object — no remount expected
    act(() => {
      rerender(
        <SceneView sceneModel={makeScene('scene-1', [makeWidgetChild()])} />
      );
    });

    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(0);

    // Different uuid — SceneStage key changes → full unmount + remount
    act(() => {
      rerender(
        <SceneView sceneModel={makeScene('scene-2', [makeWidgetChild()])} />
      );
    });

    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(2);
  });

  it('unmounts and remounts the shape subtree when the scene uuid changes', () => {
    const { rerender } = render(
      <SceneView sceneModel={makeScene('scene-1', [makeShapeChild()])} />
    );

    expect(mockShapeMountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(0);

    // Same scene uuid, fresh scene object — no remount expected
    act(() => {
      rerender(
        <SceneView sceneModel={makeScene('scene-1', [makeShapeChild()])} />
      );
    });

    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(0);

    act(() => {
      rerender(
        <SceneView sceneModel={makeScene('scene-2', [makeShapeChild()])} />
      );
    });

    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeMountSpy).toHaveBeenCalledTimes(2);
  });

  it('unmounts and remounts the whole rendered scene subtree when the scene uuid changes', () => {
    const { rerender } = render(
      <SceneView
        sceneModel={makeScene('scene-1', [makeShapeChild(), makeWidgetChild()])}
      />
    );

    expect(mockShapeMountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(0);
    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(0);

    act(() => {
      rerender(
        <SceneView
          sceneModel={makeScene('scene-2', [
            makeShapeChild(),
            makeWidgetChild(),
          ])}
        />
      );
    });

    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeMountSpy).toHaveBeenCalledTimes(2);
    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(2);
  });
});
