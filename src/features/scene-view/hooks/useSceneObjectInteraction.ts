import React from 'react';
import { toast } from 'sonner';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { deriveControllerModel } from '../utils/deriveControllerModel';
import { isEditableWidget } from '../utils/sceneNodePredicates';
import {
  resolveSceneObjectInteraction,
  type SceneObjectInteraction,
} from '../utils/sceneObjectInteraction';
import { useSceneControllerRegistry } from './useSceneControllerRegistry';

export interface UseSceneObjectInteractionOptions {
  scale: number;
  design_mode?: boolean;
}

function isMouseInput(event: React.MouseEvent<HTMLElement>): boolean {
  return (
    !('pointerType' in event) ||
    !event.pointerType ||
    event.pointerType === 'mouse'
  );
}

function logSceneObjectInteraction(interaction: SceneObjectInteraction): void {
  const { objectId, controller } = interaction;
  const scenePoint = {
    x: Number(interaction.scenePoint.x.toFixed(2)),
    y: Number(interaction.scenePoint.y.toFixed(2)),
  };
  if (!objectId) {
    console.log('[scene-interaction] miss', { scenePoint });
    return;
  }
  console.log('[scene-interaction] target', {
    objectId,
    hasController: controller !== null,
    model: controller?.model.constructor.name,
    scenePoint,
  });
}

export function useSceneObjectInteraction({
  scale,
  design_mode = true,
}: UseSceneObjectInteractionOptions) {
  const sceneRegistry = useSceneControllerRegistry();
  const [altPressed, setAltPressed] = React.useState(false);
  const insideScene = React.useRef(false);
  const widgetGesture = React.useRef({ mouse: false, pointer: false });
  const widgetReleases = React.useRef(new WeakSet<Event>());

  React.useEffect(() => {
    const reset = () => {
      insideScene.current = false;
      widgetGesture.current = { mouse: false, pointer: false };
      setAltPressed(false);
    };
    if (!design_mode) {
      reset();
      return;
    }
    const updateAlt = (event: KeyboardEvent) => {
      setAltPressed(insideScene.current && event.altKey);
    };
    // Observe releases outside the scene too, before widgets can swallow them.
    const release = (event: Event) => {
      if (widgetGesture.current.mouse || widgetGesture.current.pointer) {
        widgetReleases.current.add(event);
      }
      if (event.type === 'mouseup') {
        widgetGesture.current.mouse = false;
      } else {
        widgetGesture.current.pointer = false;
        if (event.type === 'pointercancel') {
          widgetGesture.current.mouse = false;
        }
      }
    };
    window.addEventListener('keydown', updateAlt, true);
    window.addEventListener('keyup', updateAlt, true);
    window.addEventListener('mouseup', release, true);
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', updateAlt, true);
      window.removeEventListener('keyup', updateAlt, true);
      window.removeEventListener('mouseup', release, true);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', reset);
    };
  }, [design_mode]);

  const updateAltSelection = (event: React.MouseEvent<HTMLElement>) => {
    insideScene.current = true;
    setAltPressed(design_mode && event.altKey);
  };
  const leaveScene = () => {
    insideScene.current = false;
    setAltPressed(false);
  };

  const resolveInteraction = (event: React.MouseEvent<HTMLElement>) =>
    resolveSceneObjectInteraction({
      clientX: event.clientX,
      clientY: event.clientY,
      target: event.target,
      sceneElement: event.currentTarget,
      scale,
      registry: sceneRegistry,
    });
  const interceptSelection = (event: React.MouseEvent<HTMLElement>) => {
    if (!design_mode || !isMouseInput(event)) {
      return false;
    }
    updateAltSelection(event);
    if (
      !event.altKey ||
      widgetGesture.current.mouse ||
      widgetGesture.current.pointer ||
      widgetReleases.current.has(event.nativeEvent)
    ) {
      return false;
    }
    // Cancelling pointerdown would suppress the compatibility mousedown used
    // for selection. Stop it reaching widgets, but retain its default behavior.
    if (event.type !== 'pointerdown') {
      event.preventDefault();
    }
    event.stopPropagation();
    return true;
  };
  const handlePress: React.MouseEventHandler<HTMLElement> = async (event) => {
    if (!design_mode || !isMouseInput(event)) {
      return;
    }
    const isPointerDown = event.type === 'pointerdown';
    if (isPointerDown && process.env.NODE_ENV === 'development') {
      logSceneObjectInteraction(resolveInteraction(event));
    }
    if (!interceptSelection(event)) {
      const kind = isPointerDown ? 'pointer' : 'mouse';
      widgetGesture.current[kind] = true;
      return;
    }
    // Mouse input emits pointerdown followed by mousedown. Select only once.
    if (isPointerDown || event.button !== 0) {
      return;
    }
    const { controller } = resolveInteraction(event);
    const device = controller?.ctx.proxy?.root;
    if (!device) {
      return;
    }
    if (device.isOnline) {
      broadcast_event(KaraboEvent.ShowConfiguration, { proxy: device });
    } else {
      try {
        await navigator.clipboard.writeText(device.deviceId);
      } catch {
        toast.error('Could not copy device ID to clipboard.');
      }
    }
  };
  const handleDoubleClick: React.MouseEventHandler<HTMLElement> = (event) => {
    if (!design_mode || interceptSelection(event)) {
      return;
    }
    const { controller } = resolveInteraction(event);
    if (!controller || isEditableWidget(controller.model)) {
      return;
    }
    const key = controller.model.keys[0];
    if (!key) {
      return;
    }
    const model = deriveControllerModel(controller.ctx.proxy?.binding);
    if (!model) {
      return;
    }
    model.keys = [key];
    broadcast_event(KaraboEvent.OpenControllerPanel, { model });
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    'data-scene-alt-selection': design_mode && altPressed ? true : undefined,
    onMouseEnter: updateAltSelection,
    onMouseLeave: leaveScene,
    onMouseDownCapture: handlePress,
    onMouseMoveCapture: interceptSelection,
    onMouseUpCapture: interceptSelection,
    onPointerDownCapture: handlePress,
    onPointerMoveCapture: interceptSelection,
    onPointerUpCapture: interceptSelection,
    onPointerCancelCapture: interceptSelection,
    onClickCapture: interceptSelection,
    onDoubleClickCapture: handleDoubleClick,
    onContextMenuCapture: interceptSelection,
  };
}
