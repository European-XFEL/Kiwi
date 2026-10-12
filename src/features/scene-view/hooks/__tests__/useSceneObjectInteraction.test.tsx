import { fireEvent, render } from '@testing-library/react';
import { SceneControllerRegistryProvider } from '../../contexts/SceneControllerRegistryContext';
import type {
  SceneControllerRecord,
  SceneControllerRegistry,
} from '../../contexts/SceneControllerRegistryContext';
import { createSceneControllerRegistryMock } from '@/testing';
import { DisplayLabelModel, DisplayTrendGraphModel } from '@/karabo/common/api';
import {
  type BaseBinding,
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  ImageBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import { AccessLevel } from '@/karabo/data/enums';
import { getMediator } from '@/lib/singletons/api';
import { KaraboEvent } from '@/lib/events';
import { registerRenderer } from '../../renderRegistry';
import { useSceneObjectInteraction } from '../useSceneObjectInteraction';

interface SurfaceProps {
  enabled?: boolean;
}

function Surface({ enabled }: SurfaceProps) {
  const handlers = useSceneObjectInteraction({
    scale: 2,
    enabled,
  });

  return (
    <div data-testid="surface" {...handlers}>
      <div data-scene-object-id="scene.0">
        <button data-testid="hit">child</button>
      </div>
    </div>
  );
}

function renderSurface(
  registry: SceneControllerRegistry,
  props: SurfaceProps = {}
) {
  return render(
    <SceneControllerRegistryProvider registry={registry}>
      <Surface {...props} />
    </SceneControllerRegistryProvider>
  );
}

describe('useSceneObjectInteraction', () => {
  function supportedController(
    propertyBinding: BaseBinding = new DoubleBinding({ value: 12 })
  ): SceneControllerRecord {
    const model = new DisplayLabelModel();
    model.keys = ['DEV.speed'];
    const device = new DeviceProxy('DEV');
    const binding = new BindingRoot();
    binding.value!.set('speed', propertyBinding);
    device.binding = binding;
    const proxy = new PropertyProxy(device, 'speed');
    return {
      id: 'scene.0',
      model,
      ctx: { proxy, proxies: [proxy], userAccessLevel: AccessLevel.OBSERVER },
    };
  }

  beforeEach(() => {
    registerRenderer('DisplayTrendGraph', () => null);
  });

  it('broadcasts a derived model and consumes supported double-clicks directly', () => {
    const controller = supportedController();
    controller.model.keys = ['DEV.speed', 'DEV.other'];
    const registry = createSceneControllerRegistryMock(controller);
    const opened = jest.fn();
    const unsubscribe = getMediator().on(
      KaraboEvent.OpenControllerPanel,
      opened
    );
    try {
      const { getByTestId } = renderSurface(registry);
      const bubbled = jest.fn();
      getByTestId('surface').addEventListener('dblclick', bubbled);
      expect(
        fireEvent.doubleClick(getByTestId('hit'), { clientX: 40, clientY: 60 })
      ).toBe(false);
      expect(opened).toHaveBeenCalledTimes(1);
      expect(opened).toHaveBeenCalledWith({
        model: expect.any(DisplayTrendGraphModel),
      });
      expect(opened.mock.calls[0][0].model.keys).toEqual(['DEV.speed']);
      expect(controller.model.keys).toEqual(['DEV.speed', 'DEV.other']);
      expect(registry.getController).toHaveBeenCalledWith('scene.0');
      expect(bubbled).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it.each([
    [
      'editable controller',
      (controller: SceneControllerRecord) => {
        controller.model.parent_component = 'EditableApplyLaterComponent';
      },
    ],
    [
      'missing primary key',
      (controller: SceneControllerRecord) => {
        controller.model.keys = [];
      },
    ],
  ] as const)(
    'ignores a %s without consuming the double-click',
    (_name, prepare) => {
      const controller = supportedController();
      prepare(controller);
      const opened = jest.fn();
      const unsubscribe = getMediator().on(
        KaraboEvent.OpenControllerPanel,
        opened
      );
      try {
        const { getByTestId } = renderSurface(
          createSceneControllerRegistryMock(controller)
        );
        expect(fireEvent.doubleClick(getByTestId('hit'))).toBe(true);
        expect(opened).not.toHaveBeenCalled();
      } finally {
        unsubscribe();
      }
    }
  );

  it('ignores image bindings without consuming the double-click', () => {
    const opened = jest.fn();
    const unsubscribe = getMediator().on(
      KaraboEvent.OpenControllerPanel,
      opened
    );
    try {
      const { getByTestId } = renderSurface(
        createSceneControllerRegistryMock(
          supportedController(new ImageBinding())
        )
      );
      expect(fireEvent.doubleClick(getByTestId('hit'))).toBe(true);
      expect(opened).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('leaves unsupported double-clicks unconsumed', () => {
    const { getByTestId } = renderSurface(createSceneControllerRegistryMock());
    const bubbled = jest.fn();
    getByTestId('surface').addEventListener('dblclick', bubbled);
    expect(fireEvent.doubleClick(getByTestId('hit'))).toBe(true);
    expect(bubbled).toHaveBeenCalledTimes(1);
  });

  it('skips hit testing and opening when disabled', () => {
    const registry = createSceneControllerRegistryMock(supportedController());
    const { getByTestId } = renderSurface(registry, { enabled: false });
    expect(fireEvent.doubleClick(getByTestId('hit'))).toBe(true);
    expect(registry.getController).not.toHaveBeenCalled();
  });

  it('logs scaled pointer hits in development', () => {
    const previousEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const { getByTestId } = renderSurface(
        createSceneControllerRegistryMock(supportedController())
      );
      fireEvent(
        getByTestId('hit'),
        new MouseEvent('pointerdown', {
          bubbles: true,
          clientX: 40.246,
          clientY: 60.246,
        })
      );
      expect(log).toHaveBeenCalledWith('[scene-interaction] target', {
        objectId: 'scene.0',
        hasController: true,
        model: 'DisplayLabelModel',
        scenePoint: { x: 20.12, y: 30.12 },
      });
    } finally {
      process.env.NODE_ENV = previousEnvironment;
      log.mockRestore();
    }
  });

  it('does not process pointer-down logging outside development', () => {
    const registry = createSceneControllerRegistryMock(supportedController());
    const { getByTestId } = renderSurface(registry);
    fireEvent.pointerDown(getByTestId('hit'));
    expect(registry.getController).not.toHaveBeenCalled();
  });
});
