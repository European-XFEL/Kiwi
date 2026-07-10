import React from 'react';
import type { BaseWidgetObjectData } from '@/karabo/common/api';
import type { ControllerContainerContext } from '@/features/controllers/api';
import { useSceneControllerRegistry } from './useSceneControllerRegistry';

export function useRegisterSceneControllerWidget(
  objectId: string,
  model: BaseWidgetObjectData,
  ctx: ControllerContainerContext
): void {
  const sceneRegistry = useSceneControllerRegistry();
  const ctxRef = React.useRef(ctx);
  ctxRef.current = ctx;
  const modelRef = React.useRef(model);
  modelRef.current = model;

  // useEffect is safe here because registry reads are imperative (hit testing,
  // proxy collection on demand). If reads ever become reactive (driving render),
  // switch to useLayoutEffect so children register before parent reads.
  React.useEffect(() => {
    if (!sceneRegistry || !objectId) return;

    sceneRegistry.registerController(
      objectId,
      modelRef.current,
      ctxRef.current
    );
    return () => {
      sceneRegistry.unregisterController(objectId);
    };
  }, [sceneRegistry, objectId]);

  // Re-register only when ctx content changes, not on every render.
  // useController returns a new object literal every render (no memoisation),
  // so ctx reference is unstable — use content fields as deps instead.
  // TODO: stabilise ctx in useController with useMemo so this hook can use ctx directly.
  React.useEffect(() => {
    if (!sceneRegistry || !objectId) return;
    // Update-only: a missing record means the mount effect unregistered or the
    // registry was disposed, and an update must not recreate it.
    if (!sceneRegistry.getController(objectId)) return;

    sceneRegistry.registerController(objectId, model, ctxRef.current);
  }, [sceneRegistry, objectId, model, ctx.proxies, ctx.userAccessLevel]);
}
