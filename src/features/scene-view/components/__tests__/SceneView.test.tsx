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
const mockRenderedEntries: Array<{
  layer: 'shape' | 'widget';
  kind: string;
  objectId: string;
}> = [];

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
      objectId,
    }: {
      layer: 'shape' | 'widget';
      model: { constructor: { name: string } };
      objectId: string;
    }) {
      mockRenderedEntries.push({
        layer,
        kind: model.constructor.name,
        objectId,
      });
      return ReactActual.createElement(LifecycleTracker, { layer });
    },
  };
});

// Bootstrap side-effect import
jest.mock('../../renderers', () => ({}));

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
        scale={1}
        fitMode="fit-page"
      />
    );

    expect(mockRenderedEntries).toEqual([
      { layer: 'shape', kind: 'RectangleModel', objectId: 'scene:scene-1.1' },
      { layer: 'shape', kind: 'RectangleModel', objectId: 'scene:scene-1.3' },
      {
        layer: 'widget',
        kind: 'DisplayLabelModel',
        objectId: 'scene:scene-1.0',
      },
      {
        layer: 'widget',
        kind: 'DisplayLabelModel',
        objectId: 'scene:scene-1.2',
      },
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
        scale={1}
        fitMode="fit-page"
      />
    );

    expect(mockRenderedEntries).toEqual([
      { layer: 'shape', kind: 'BoxLayoutModel', objectId: 'scene:scene-1.1' },
      { layer: 'shape', kind: 'RectangleModel', objectId: 'scene:scene-1.2' },
      {
        layer: 'widget',
        kind: 'DisplayLabelModel',
        objectId: 'scene:scene-1.0',
      },
      {
        layer: 'widget',
        kind: 'BoxLayoutModel',
        objectId: 'scene:scene-1.1',
      },
    ]);
  });

  it('skips the scene walk when the parent rerenders with unchanged props', () => {
    const sceneModel = makeScene('scene-1', [
      makeShapeChild(),
      makeWidgetChild(),
    ]);
    const { rerender } = render(
      <SceneView sceneModel={sceneModel} scale={1} fitMode="fit-page" />
    );

    expect(mockRenderedEntries).toHaveLength(2);

    rerender(
      <SceneView sceneModel={sceneModel} scale={1} fitMode="fit-page" />
    );

    expect(mockRenderedEntries).toHaveLength(2);
  });

  it('unmounts and remounts the widget subtree when the scene uuid changes', () => {
    const { rerender } = render(
      <SceneView
        sceneModel={makeScene('scene-1', [makeWidgetChild()])}
        scale={1}
        fitMode="fit-page"
      />
    );

    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(0);

    act(() => {
      rerender(
        <SceneView
          sceneModel={makeScene('scene-1', [makeWidgetChild()])}
          scale={1}
          fitMode="fit-page"
        />
      );
    });

    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(0);

    act(() => {
      rerender(
        <SceneView
          sceneModel={makeScene('scene-2', [makeWidgetChild()])}
          scale={1}
          fitMode="fit-page"
        />
      );
    });

    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(2);
  });

  it('unmounts and remounts the shape subtree when the scene uuid changes', () => {
    const { rerender } = render(
      <SceneView
        sceneModel={makeScene('scene-1', [makeShapeChild()])}
        scale={1}
        fitMode="fit-page"
      />
    );

    expect(mockShapeMountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(0);

    act(() => {
      rerender(
        <SceneView
          sceneModel={makeScene('scene-1', [makeShapeChild()])}
          scale={1}
          fitMode="fit-page"
        />
      );
    });

    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(0);

    act(() => {
      rerender(
        <SceneView
          sceneModel={makeScene('scene-2', [makeShapeChild()])}
          scale={1}
          fitMode="fit-page"
        />
      );
    });

    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeMountSpy).toHaveBeenCalledTimes(2);
  });

  it('unmounts and remounts the whole rendered scene subtree when the scene uuid changes', () => {
    const { rerender } = render(
      <SceneView
        sceneModel={makeScene('scene-1', [makeShapeChild(), makeWidgetChild()])}
        scale={1}
        fitMode="fit-page"
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
          scale={1}
          fitMode="fit-page"
        />
      );
    });

    expect(mockShapeUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockWidgetUnmountSpy).toHaveBeenCalledTimes(1);
    expect(mockShapeMountSpy).toHaveBeenCalledTimes(2);
    expect(mockWidgetMountSpy).toHaveBeenCalledTimes(2);
  });
});
