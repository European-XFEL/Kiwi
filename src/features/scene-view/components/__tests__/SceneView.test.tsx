import React from 'react';
import { act, render } from '@testing-library/react';
import {
  type BaseSceneObjectData,
  DisplayLabelModel,
  RectangleModel,
  SceneModel,
} from '@/karabo/common/api';
import SceneView from '../SceneView';

// Prefixed with "mock" so Jest allows them inside the mock factory below.
const mockWidgetMountSpy = jest.fn();
const mockWidgetUnmountSpy = jest.fn();
const mockShapeMountSpy = jest.fn();
const mockShapeUnmountSpy = jest.fn();
const mockRenderedEntries: Array<{
  kind: string;
  objectId: string;
}> = [];

// KaraboSceneWidget is mocked to components that track object mount/unmount.
// Written without JSX so the factory doesn't reference the hoisted jsx_runtime.
jest.mock('../../KaraboSceneWidget', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  function LifecycleTracker({ shape }: { shape: boolean }) {
    ReactActual.useEffect(() => {
      if (shape) {
        mockShapeMountSpy();
      } else {
        mockWidgetMountSpy();
      }

      return () => {
        if (shape) {
          mockShapeUnmountSpy();
        } else {
          mockWidgetUnmountSpy();
        }
      };
    }, [shape]);
    return ReactActual.createElement('div');
  }

  return {
    KaraboSceneWidget: function MockKaraboSceneWidget({
      model,
      objectId,
    }: {
      model: { constructor: { name: string } };
      objectId: string;
    }) {
      mockRenderedEntries.push({
        kind: model.constructor.name,
        objectId,
      });
      return ReactActual.createElement(LifecycleTracker, {
        shape: model.constructor.name === 'RectangleModel',
      });
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

function makeScene(uuid: string, children: BaseSceneObjectData[]) {
  return new SceneModel({
    uuid,
    width: 800,
    height: 600,
    children,
  });
}

describe('SceneView rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderedEntries.length = 0;
  });

  it('renders every root object once in model order with stable object ids', () => {
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
      {
        kind: 'DisplayLabelModel',
        objectId: 'scene:scene-1.0',
      },
      { kind: 'RectangleModel', objectId: 'scene:scene-1.1' },
      {
        kind: 'DisplayLabelModel',
        objectId: 'scene:scene-1.2',
      },
      { kind: 'RectangleModel', objectId: 'scene:scene-1.3' },
    ]);
  });

  it('isolates the scene content stacking context', () => {
    const { container } = render(
      <SceneView
        sceneModel={makeScene('scene-1', [])}
        scale={1}
        fitMode="fit-page"
      />
    );

    expect(
      container.querySelector('[id^="SceneView-Scene-Inner-"]')
    ).toHaveStyle({ isolation: 'isolate' });
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
