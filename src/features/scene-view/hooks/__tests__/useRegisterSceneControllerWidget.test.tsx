import { renderHook } from '@testing-library/react';
import { DisplayLabelModel } from '@/karabo/common/api';
import type { ControllerContainerContext } from '@/features/controllers/api';
import { AccessLevel } from '@/karabo/data/enums';
import React from 'react';
import { SceneControllerRegistry } from '@/features/scenepanel/SceneControllerRegistry';
import { SceneControllerRegistryProvider } from '../../contexts/SceneControllerRegistryContext';
import { useRegisterSceneControllerWidget } from '../useRegisterSceneControllerWidget';

const makeModel = () => {
  const m = new DisplayLabelModel();
  m.keys = ['DEV.speed'];
  return m;
};

const makeCtx = (
  overrides?: Partial<ControllerContainerContext>
): ControllerContainerContext => ({
  proxy: undefined,
  proxies: [
    { key: 'DEV.speed' },
  ] as unknown as ControllerContainerContext['proxies'],
  userAccessLevel: AccessLevel.OBSERVER,
  ...overrides,
});

const makeWrapper = (registry: SceneControllerRegistry) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SceneControllerRegistryProvider registry={registry}>
        {children}
      </SceneControllerRegistryProvider>
    );
  };

describe('useRegisterSceneControllerWidget', () => {
  it('registers the controller ctx on mount', () => {
    const registry = new SceneControllerRegistry();
    const model = makeModel();
    const ctx = makeCtx();

    renderHook(() => useRegisterSceneControllerWidget('scene.0', model, ctx), {
      wrapper: makeWrapper(registry),
    });

    const record = registry.getController('scene.0');
    expect(record?.model).toBe(model);
    expect(record?.ctx).toBe(ctx);
  });

  it('unregisters the controller on unmount', () => {
    const registry = new SceneControllerRegistry();
    const model = makeModel();

    const { unmount } = renderHook(
      () => useRegisterSceneControllerWidget('scene.0', model, makeCtx()),
      { wrapper: makeWrapper(registry) }
    );

    unmount();

    expect(registry.has('scene.0')).toBe(false);
    expect(registry.getController('scene.0')).toBeUndefined();
  });

  it('updates ctx in the registry when ctx changes', () => {
    const registry = new SceneControllerRegistry();
    const model = makeModel();
    const ctxV1 = makeCtx();
    const ctxV2 = makeCtx();

    const { rerender } = renderHook(
      ({ ctx }) => useRegisterSceneControllerWidget('scene.0', model, ctx),
      { wrapper: makeWrapper(registry), initialProps: { ctx: ctxV1 } }
    );

    rerender({ ctx: ctxV2 });

    expect(registry.getController('scene.0')?.ctx).toBe(ctxV2);
  });

  // Regression: model reference churn must not unregister the controller,
  // which would drop ctx from the registry until the next update.
  it('updates the model without clearing ctx when model reference changes', () => {
    const registry = new SceneControllerRegistry();
    const modelV1 = makeModel();
    const modelV2 = makeModel();
    const ctx = makeCtx();

    const { rerender } = renderHook(
      ({ model }) => useRegisterSceneControllerWidget('scene.0', model, ctx),
      { wrapper: makeWrapper(registry), initialProps: { model: modelV1 } }
    );

    rerender({ model: modelV2 });

    const record = registry.getController('scene.0');
    expect(record?.model).toBe(modelV2);
    expect(record?.ctx).toBe(ctx);
  });

  it('updates both model and ctx in one rerender when both change', () => {
    const registry = new SceneControllerRegistry();
    const modelV1 = makeModel();
    const modelV2 = makeModel();
    const ctxV1 = makeCtx();
    const ctxV2 = makeCtx();

    const { rerender } = renderHook(
      ({ model, ctx }) =>
        useRegisterSceneControllerWidget('scene.0', model, ctx),
      {
        wrapper: makeWrapper(registry),
        initialProps: { model: modelV1, ctx: ctxV1 },
      }
    );

    rerender({ model: modelV2, ctx: ctxV2 });

    const record = registry.getController('scene.0');
    expect(record?.model).toBe(modelV2);
    expect(record?.ctx).toBe(ctxV2);
  });

  // Regression: the ctx-update effect is update-only. It must not recreate a
  // record for a registry that was disposed while the controller stays mounted.
  it('does not recreate a record after the registry is disposed', () => {
    const registry = new SceneControllerRegistry();
    const model = makeModel();

    const { rerender } = renderHook(
      ({ ctx }) => useRegisterSceneControllerWidget('scene.0', model, ctx),
      { wrapper: makeWrapper(registry), initialProps: { ctx: makeCtx() } }
    );

    registry.dispose();
    // New proxies reference so the ctx-update effect actually reruns.
    rerender({ ctx: makeCtx() });

    expect(registry.getController('scene.0')).toBeUndefined();
  });

  // Regression: useController returns a new ctx object every render even when
  // proxies and accessLevel haven't changed. The hook must not re-register on
  // every render — only when the content of ctx actually changes.
  it('does not re-register when ctx is a new object with the same proxies and accessLevel', () => {
    const registry = new SceneControllerRegistry();
    const model = makeModel();
    const proxies = [
      { key: 'DEV.speed' },
    ] as unknown as ControllerContainerContext['proxies'];

    const spy = jest.spyOn(registry, 'registerController');

    const { rerender } = renderHook(
      ({ ctx }) => useRegisterSceneControllerWidget('scene.0', model, ctx),
      {
        wrapper: makeWrapper(registry),
        initialProps: {
          ctx: {
            proxy: proxies[0],
            proxies,
            userAccessLevel: AccessLevel.OBSERVER,
          },
        },
      }
    );

    const callsAfterMount = spy.mock.calls.length;

    // New ctx object, same proxies reference and same accessLevel — pure reference churn
    rerender({
      ctx: {
        proxy: proxies[0],
        proxies,
        userAccessLevel: AccessLevel.OBSERVER,
      },
    });

    expect(spy.mock.calls.length).toBe(callsAfterMount);
  });
});
