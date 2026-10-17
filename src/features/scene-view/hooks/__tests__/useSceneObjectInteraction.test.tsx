import { toast } from 'sonner';
import { fireEvent, render, waitFor } from '@testing-library/react';
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
import * as renderRegistry from '../../renderRegistry';
import { useSceneObjectInteraction } from '../useSceneObjectInteraction';

interface SurfaceProps {
  design_mode?: boolean;
  onClick?: () => void;
  onWidgetEvent?: () => void;
}

function Surface({ design_mode, onClick, onWidgetEvent }: SurfaceProps) {
  const handlers = useSceneObjectInteraction({
    scale: 2,
    design_mode,
  });

  return (
    <div data-testid="surface" {...handlers}>
      <div data-scene-object-id="scene.0">
        <button
          data-testid="hit"
          onClick={onClick}
          onMouseDown={onWidgetEvent}
          onMouseMove={onWidgetEvent}
          onMouseUp={onWidgetEvent}
          onPointerDown={onWidgetEvent}
          onPointerMove={onWidgetEvent}
          onPointerUp={onWidgetEvent}
          onDoubleClick={onWidgetEvent}
          onContextMenu={onWidgetEvent}
        >
          child
        </button>
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
    renderRegistry.registerRenderer('DisplayTrendGraph', () => null);
  });

  describe('Alt cursor', () => {
    it('marks only the scene while Alt is held and resets on release or blur', () => {
      const { getByTestId } = renderSurface(
        createSceneControllerRegistryMock()
      );
      const surface = getByTestId('surface');
      expect(surface).not.toHaveAttribute('data-scene-alt-selection');
      fireEvent.mouseEnter(surface);
      fireEvent.keyDown(window, { key: 'Alt', altKey: true });
      expect(surface).toHaveAttribute('data-scene-alt-selection', 'true');
      expect(document.body).not.toHaveAttribute('data-scene-alt-selection');
      fireEvent.keyUp(window, { key: 'Alt', altKey: false });
      expect(surface).not.toHaveAttribute('data-scene-alt-selection');
      fireEvent.keyDown(window, { key: 'Alt', altKey: true });
      fireEvent.blur(window);
      expect(surface).not.toHaveAttribute('data-scene-alt-selection');
    });

    it('synchronizes Alt when entering or moving over the scene', () => {
      const { getByTestId } = renderSurface(
        createSceneControllerRegistryMock()
      );
      const surface = getByTestId('surface');
      fireEvent.mouseEnter(surface, { altKey: true });
      expect(surface).toHaveAttribute('data-scene-alt-selection', 'true');
      fireEvent.mouseMove(getByTestId('hit'), { altKey: false });
      expect(surface).not.toHaveAttribute('data-scene-alt-selection');
    });

    it('does not mark a scene with design mode off and removes listeners on unmount', () => {
      const registry = createSceneControllerRegistryMock();
      const { getByTestId, unmount } = renderSurface(registry, {
        design_mode: false,
      });
      fireEvent.keyDown(window, { key: 'Alt', altKey: true });
      fireEvent.mouseEnter(getByTestId('surface'), { altKey: true });
      expect(getByTestId('surface')).not.toHaveAttribute(
        'data-scene-alt-selection'
      );
      unmount();
      const active = renderSurface(registry);
      const remove = jest.spyOn(window, 'removeEventListener');
      active.unmount();
      expect(remove).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        true
      );
      expect(remove).toHaveBeenCalledWith('keyup', expect.any(Function), true);
      expect(remove).toHaveBeenCalledWith('blur', expect.any(Function));
      remove.mockRestore();
    });
  });

  describe('Alt+left-button press', () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = jest.fn();
    beforeEach(() => {
      writeText.mockReset().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
    });
    afterEach(() => {
      if (descriptor) {
        Object.defineProperty(navigator, 'clipboard', descriptor);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
      jest.restoreAllMocks();
    });

    it.each([false, true])(
      'opens the primary online device (editable: %s)',
      (editable) => {
        const controller = supportedController();
        const device = controller.ctx.proxy!.root;
        device.isOnline = true;
        device.binding = new BindingRoot();
        if (editable) {
          controller.model.parent_component = 'EditableApplyLaterComponent';
        }
        controller.ctx.proxies = [
          controller.ctx.proxy!,
          new PropertyProxy(new DeviceProxy('OTHER'), 'value'),
        ];
        const opened = jest.fn();
        const unsubscribe = getMediator().on(
          KaraboEvent.ShowConfiguration,
          opened
        );
        try {
          const childClick = jest.fn();
          const { getByTestId } = renderSurface(
            createSceneControllerRegistryMock(controller),
            { onClick: childClick }
          );
          const press = new MouseEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            altKey: true,
            button: 0,
          });
          fireEvent(getByTestId('hit'), press);
          expect(press.defaultPrevented).toBe(false);
          expect(opened).not.toHaveBeenCalled();
          expect(
            fireEvent.mouseDown(getByTestId('hit'), { altKey: true, button: 0 })
          ).toBe(false);
          fireEvent.pointerUp(getByTestId('hit'), { altKey: true });
          fireEvent.mouseUp(getByTestId('hit'), { altKey: true });
          fireEvent.click(getByTestId('hit'), { altKey: true });
          expect(opened).toHaveBeenCalledTimes(1);
          expect(opened.mock.calls[0][0].proxy).toBe(device);
          expect(writeText).not.toHaveBeenCalled();
          expect(childClick).not.toHaveBeenCalled();
        } finally {
          unsubscribe();
        }
      }
    );

    it('copies offline IDs without broadcasting or running the child action', () => {
      const opened = jest.fn();
      const unsubscribe = getMediator().on(
        KaraboEvent.ShowConfiguration,
        opened
      );
      try {
        const childClick = jest.fn();
        const { getByTestId } = renderSurface(
          createSceneControllerRegistryMock(supportedController()),
          { onClick: childClick }
        );
        expect(fireEvent.mouseDown(getByTestId('hit'), { altKey: true })).toBe(
          false
        );
        fireEvent.mouseUp(getByTestId('hit'), { altKey: true });
        fireEvent.click(getByTestId('hit'), { altKey: true });
        expect(writeText).toHaveBeenCalledTimes(1);
        expect(writeText).toHaveBeenCalledWith('DEV');
        expect(opened).not.toHaveBeenCalled();
        expect(childClick).not.toHaveBeenCalled();
      } finally {
        unsubscribe();
      }
    });

    it.each(['unavailable', 'rejected'])(
      'reports %s clipboard access',
      async (failure) => {
        if (failure === 'unavailable') {
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: undefined,
          });
        } else {
          writeText.mockRejectedValue(new Error('Denied'));
        }
        const error = jest.spyOn(toast, 'error').mockReturnValue('toast');
        const { getByTestId } = renderSurface(
          createSceneControllerRegistryMock(supportedController())
        );
        expect(fireEvent.mouseDown(getByTestId('hit'), { altKey: true })).toBe(
          false
        );
        await waitFor(() =>
          expect(error).toHaveBeenCalledWith(
            'Could not copy device ID to clipboard.'
          )
        );
      }
    );

    it.each([
      ['ordinary click', false, 0, true],
      ['design mode off', true, 0, false],
    ] as const)(
      'leaves %s unconsumed',
      (_name, altKey, button, design_mode) => {
        const registry = createSceneControllerRegistryMock(
          supportedController()
        );
        const { getByTestId } = renderSurface(registry, { design_mode });
        expect(
          fireEvent.mouseDown(getByTestId('hit'), { altKey, button })
        ).toBe(true);
        expect(writeText).not.toHaveBeenCalled();
        expect(registry.getController).not.toHaveBeenCalled();
      }
    );

    it.each([false, true])(
      'consumes missing proxies/controllers and blank space (%s)',
      (hasController) => {
        const controller = supportedController();
        controller.ctx.proxy = undefined;
        controller.ctx.proxies = [];
        const registry = hasController
          ? createSceneControllerRegistryMock(controller)
          : createSceneControllerRegistryMock();
        const { getByTestId } = renderSurface(registry);
        expect(fireEvent.mouseDown(getByTestId('hit'), { altKey: true })).toBe(
          false
        );
        expect(
          fireEvent.mouseDown(getByTestId('surface'), { altKey: true })
        ).toBe(false);
        expect(writeText).not.toHaveBeenCalled();
      }
    );
  });

  it.each([
    'pointerdown',
    'mousedown',
    'pointermove',
    'mousemove',
    'pointerup',
    'mouseup',
    'click',
    'dblclick',
    'contextmenu',
  ])(
    'intercepts native and React widget %s handlers during Alt selection',
    (type) => {
      const childClick = jest.fn();
      const { getByTestId } = renderSurface(
        createSceneControllerRegistryMock(),
        {
          onClick: childClick,
          onWidgetEvent: childClick,
        }
      );
      const hit = getByTestId('hit');
      const native = jest.fn();
      hit.addEventListener(type, native);
      hit.addEventListener(type, native, true);
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        altKey: true,
      });
      if (type.startsWith('pointer')) {
        Object.defineProperty(event, 'pointerType', { value: 'mouse' });
      }
      fireEvent(hit, event);
      expect(native).not.toHaveBeenCalled();
      expect(childClick).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(type !== 'pointerdown');
      fireEvent(hit, new MouseEvent(type, { bubbles: true }));
      expect(childClick).toHaveBeenCalledTimes(1);
    }
  );

  it('observes Alt before a focused child swallows it and resets on exit', () => {
    const { getByTestId } = renderSurface(createSceneControllerRegistryMock());
    const hit = getByTestId('hit');
    const surface = getByTestId('surface');
    hit.addEventListener('keydown', (event) => event.stopPropagation());
    hit.focus();
    fireEvent.mouseEnter(surface);
    fireEvent.keyDown(hit, { key: 'Alt', altKey: true });
    expect(surface).toHaveAttribute('data-scene-alt-selection');
    fireEvent.mouseLeave(surface, { altKey: true });
    expect(surface).not.toHaveAttribute('data-scene-alt-selection');
    fireEvent.mouseEnter(surface, { altKey: true });
    expect(surface).toHaveAttribute('data-scene-alt-selection');
  });

  it.each(['mouse', 'pointer'] as const)(
    'delivers an existing %s drag to document listeners and clears it after outside release',
    (kind) => {
      const { getByTestId } = renderSurface(
        createSceneControllerRegistryMock()
      );
      const hit = getByTestId('hit');
      const move = jest.fn();
      const release = jest.fn();
      const moveType = `${kind}move`;
      const releaseType = `${kind}up`;
      document.addEventListener(moveType, move);
      document.addEventListener(releaseType, release);
      try {
        fireEvent(hit, new MouseEvent(`${kind}down`, { bubbles: true }));
        fireEvent.keyDown(hit, { key: 'Alt', altKey: true });
        fireEvent(
          hit,
          new MouseEvent(moveType, { bubbles: true, altKey: true, buttons: 1 })
        );
        expect(move).toHaveBeenCalledTimes(1);
        fireEvent(
          document.body,
          new MouseEvent(moveType, { bubbles: true, altKey: true, buttons: 1 })
        );
        expect(move).toHaveBeenCalledTimes(2);
        fireEvent(
          document.body,
          new MouseEvent(releaseType, { bubbles: true, altKey: true })
        );
        expect(release).toHaveBeenCalledTimes(1);
        fireEvent(
          hit,
          new MouseEvent(moveType, { bubbles: true, altKey: true })
        );
        expect(move).toHaveBeenCalledTimes(2);
      } finally {
        document.removeEventListener(moveType, move);
        document.removeEventListener(releaseType, release);
      }
    }
  );

  it('delivers both compatibility releases for an existing widget drag inside the scene', () => {
    const child = jest.fn();
    const { getByTestId } = renderSurface(createSceneControllerRegistryMock(), {
      onWidgetEvent: child,
    });
    const hit = getByTestId('hit');
    fireEvent.pointerDown(hit);
    fireEvent.mouseDown(hit);
    child.mockClear();
    fireEvent.keyDown(hit, { key: 'Alt', altKey: true });
    fireEvent.pointerMove(hit, { altKey: true });
    fireEvent.mouseMove(hit, { altKey: true });
    fireEvent.pointerUp(hit, { altKey: true });
    fireEvent.mouseUp(hit, { altKey: true });
    expect(child).toHaveBeenCalledTimes(4);
    fireEvent.mouseMove(hit, { altKey: true });
    expect(child).toHaveBeenCalledTimes(4);
  });

  it('leaves wheel and touch pointer events unchanged with Alt held', () => {
    const child = jest.fn();
    const { getByTestId } = renderSurface(createSceneControllerRegistryMock(), {
      onWidgetEvent: child,
    });
    const hit = getByTestId('hit');
    const wheel = jest.fn();
    hit.addEventListener('wheel', wheel);
    expect(fireEvent.wheel(hit, { altKey: true, deltaY: 20 })).toBe(true);
    expect(wheel).toHaveBeenCalledTimes(1);
    for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        altKey: true,
      });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      expect(fireEvent(hit, event)).toBe(true);
    }
    expect(child).toHaveBeenCalledTimes(3);
  });

  it.each([1, 2])(
    'suppresses Alt button %s without selecting a device',
    (button) => {
      const registry = createSceneControllerRegistryMock(supportedController());
      const child = jest.fn();
      const { getByTestId } = renderSurface(registry, { onWidgetEvent: child });
      expect(
        fireEvent.mouseDown(getByTestId('hit'), { button, altKey: true })
      ).toBe(false);
      expect(registry.getController).not.toHaveBeenCalled();
      expect(child).not.toHaveBeenCalled();
    }
  );

  it('clears Alt selection when design mode is off and restores ordinary widget input', () => {
    const registry = createSceneControllerRegistryMock();
    const child = jest.fn();
    const { getByTestId, rerender } = renderSurface(registry, {
      onWidgetEvent: child,
    });
    fireEvent.mouseEnter(getByTestId('surface'), { altKey: true });
    expect(getByTestId('surface')).toHaveAttribute('data-scene-alt-selection');
    rerender(
      <SceneControllerRegistryProvider registry={registry}>
        <Surface design_mode={false} onWidgetEvent={child} />
      </SceneControllerRegistryProvider>
    );
    expect(getByTestId('surface')).not.toHaveAttribute(
      'data-scene-alt-selection'
    );
    fireEvent.mouseDown(getByTestId('hit'), { altKey: true });
    expect(child).toHaveBeenCalledTimes(1);
  });

  it('broadcasts a derived model and consumes supported double-clicks directly', () => {
    const renderer = jest
      .spyOn(renderRegistry, 'getRenderer')
      .mockReturnValue(undefined);
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
      expect(renderer).not.toHaveBeenCalled();
    } finally {
      renderer.mockRestore();
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

  it('skips hit testing and opening when design mode is off', () => {
    const registry = createSceneControllerRegistryMock(supportedController());
    const { getByTestId } = renderSurface(registry, { design_mode: false });
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
