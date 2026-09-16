import {
  DisplayLabelModel,
  type BaseWidgetObjectData,
} from '@/karabo/common/api';
import type { ControllerContainerContext } from '@/features/controllers/api';
import { AccessLevel } from '@/karabo/data/enums';
import { SceneControllerRegistry } from '../SceneControllerRegistry';

const makeControllerModel = () => {
  const model = new DisplayLabelModel();
  model.keys = ['DEV.speed'];
  return model as BaseWidgetObjectData;
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

describe('SceneControllerRegistry', () => {
  it('registers and unregisters a controller by objectId', () => {
    const registry = new SceneControllerRegistry();
    const model = makeControllerModel();
    const ctx = makeCtx();

    registry.registerController('scene.0', model, ctx);

    expect(registry.has('scene.0')).toBe(true);
    expect(registry.getController('scene.0')).toEqual({
      id: 'scene.0',
      model,
      ctx,
    });

    registry.unregisterController('scene.0');

    expect(registry.has('scene.0')).toBe(false);
    expect(registry.getController('scene.0')).toBeUndefined();
  });

  it('replaces a controller record when the same objectId registers again', () => {
    const registry = new SceneControllerRegistry();
    const modelV1 = makeControllerModel();
    const modelV2 = makeControllerModel();
    const ctxV1 = makeCtx();
    const ctxV2 = makeCtx();

    registry.registerController('scene.0', modelV1, ctxV1);
    registry.registerController('scene.0', modelV2, ctxV2);

    expect(registry.getController('scene.0')?.model).toBe(modelV2);
    expect(registry.getController('scene.0')?.ctx).toBe(ctxV2);
    expect(registry.values()).toHaveLength(1);
  });

  it('returns dirty proxies by edit_value presence', () => {
    type TestProxy = ControllerContainerContext['proxies'][number];
    const registry = new SceneControllerRegistry();
    const cleanProxy = {
      key: 'DEV.clean',
      edit_value: undefined,
    } as unknown as TestProxy;
    const dirtyProxy = {
      key: 'DEV.dirty',
      edit_value: { value_: 7 },
    } as unknown as TestProxy;
    const ctx = makeCtx({
      proxy: dirtyProxy,
      proxies: [
        cleanProxy,
        dirtyProxy,
      ] as ControllerContainerContext['proxies'],
    });

    registry.registerController('scene.0', makeControllerModel(), ctx);

    expect(registry.getDirtyProxies()).toEqual([dirtyProxy]);
    expect(registry.hasDirtyProxies()).toBe(true);
  });

  it('reads dirty state from the live proxy references', () => {
    type TestProxy = ControllerContainerContext['proxies'][number];
    const registry = new SceneControllerRegistry();
    const proxy = {
      key: 'DEV.speed',
      edit_value: undefined,
    } as unknown as TestProxy;

    registry.registerController(
      'scene.0',
      makeControllerModel(),
      makeCtx({
        proxy,
        proxies: [proxy] as ControllerContainerContext['proxies'],
      })
    );

    expect(registry.hasDirtyProxies()).toBe(false);

    proxy.edit_value = { value_: 10 };

    expect(registry.getDirtyProxies()).toEqual([proxy]);
    expect(registry.hasDirtyProxies()).toBe(true);
  });

  it('reports no dirty proxies when no mounted controller has edit_value', () => {
    const registry = new SceneControllerRegistry();

    registry.registerController('scene.0', makeControllerModel(), makeCtx());

    expect(registry.getDirtyProxies()).toEqual([]);
    expect(registry.hasDirtyProxies()).toBe(false);
  });

  it('clears mounted controllers on dispose', () => {
    const registry = new SceneControllerRegistry();

    registry.registerController('scene.0', makeControllerModel(), makeCtx());
    registry.dispose();

    expect(registry.controllers.size).toBe(0);
    expect(registry.getDirtyProxies()).toEqual([]);
  });

  it('exposes options id and type as metadata', () => {
    const registry = new SceneControllerRegistry({ id: 'abc', type: 'scene' });

    expect(registry.options.id).toBe('abc');
    expect(registry.options.type).toBe('scene');
  });
});
