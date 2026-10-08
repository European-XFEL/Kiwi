import type { BaseWidgetObjectData } from '@/karabo/common/api';
import type { ControllerContainerContext } from '@/features/controllers/api';
import type {
  SceneControllerRecord,
  SceneControllerRegistry as SceneControllerRegistryContract,
} from '@/features/scene-view/contexts/SceneControllerRegistryContext';
import type { LoadedSceneRef } from '@/store/api';
import { declineControllerEdits } from '@/features/controllers/utils/controller_edit_actions';
import { send_property_changes } from '@/lib/request';

export interface SceneControllerRegistryOptions {
  id?: string;
  type?: string;
}
export type { SceneControllerRecord };

function isLoadedSceneRef(
  init: LoadedSceneRef | SceneControllerRegistryOptions
): init is LoadedSceneRef {
  return 'uuid' in init;
}

type SceneProxy = ControllerContainerContext['proxies'][number];

function isDirtyProxy(proxy: SceneProxy): boolean {
  return proxy.edit_value !== undefined;
}

export class SceneControllerRegistry implements SceneControllerRegistryContract {
  private readonly records = new Map<string, SceneControllerRecord>();

  readonly options: SceneControllerRegistryOptions;
  readonly sceneRef?: LoadedSceneRef;

  constructor(
    init: LoadedSceneRef | SceneControllerRegistryOptions = { type: 'scene' }
  ) {
    const sceneRef = isLoadedSceneRef(init) ? init : undefined;
    this.sceneRef = sceneRef;
    this.options = sceneRef
      ? { id: sceneRef.uuid, type: 'scene' }
      : (init as SceneControllerRegistryOptions);
  }

  get controllers(): ReadonlyMap<string, SceneControllerRecord> {
    return this.records;
  }

  has(objectId: string): boolean {
    return this.records.has(objectId);
  }

  get(objectId: string): SceneControllerRecord | undefined {
    return this.getController(objectId);
  }

  values(): SceneControllerRecord[] {
    return Array.from(this.records.values());
  }

  registerController(
    objectId: string,
    model: BaseWidgetObjectData,
    ctx: ControllerContainerContext
  ): void {
    this.records.set(objectId, { id: objectId, model, ctx });
  }

  unregisterController(objectId: string): void {
    this.records.delete(objectId);
  }

  getController(objectId: string): SceneControllerRecord | undefined {
    return this.records.get(objectId);
  }

  getDirtyProxies(): ControllerContainerContext['proxies'] {
    const dirty: ControllerContainerContext['proxies'] = [];
    for (const record of this.records.values()) {
      dirty.push(...record.ctx.proxies.filter(isDirtyProxy));
    }
    return dirty;
  }

  hasDirtyProxies(): boolean {
    for (const record of this.records.values()) {
      if (record.ctx.proxies.some(isDirtyProxy)) {
        return true;
      }
    }
    return false;
  }

  applyAll(): void {
    const editable = this.values().filter(
      ({ model }) => model.parent_component === 'EditableApplyLaterComponent'
    );
    send_property_changes(
      editable.flatMap(({ ctx }) => ctx.proxies.filter(isDirtyProxy))
    );
    for (const { ctx } of editable) {
      ctx.editActions?.apply();
    }
  }

  declineAll(): void {
    for (const { model, ctx } of this.values()) {
      if (model.parent_component !== 'EditableApplyLaterComponent') continue;
      if (ctx.editActions) ctx.editActions.decline();
      else declineControllerEdits(ctx.proxies);
    }
  }

  dispose(): void {
    this.records.clear();
  }
}
