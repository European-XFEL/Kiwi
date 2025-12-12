/**
 * Scene.ts
 * -----------------------------------------------------------------------------
 * Scene loader using Registry + KeyResolver.
 * Produces both a hierarchical SceneModel and a flat list for canvas rendering.
 */

import { parseSceneChildren } from '../scene_intermediate_parser';
import { defaultRegistry } from './Registry';
import { resolveRegistryKey } from './KeyResolver';
import { registerAllBuilders } from './registerBuilders';
import { SceneModel } from '../scene_models/SceneModel';
import {
  BaseSceneElementModel,
  BaseLayoutElementModel,
} from '../scene_models/BaseModels';

export class Scene {
  private _sceneModel: SceneModel;
  private _flatElements: BaseSceneElementModel[] = [];

  constructor(sceneJson: string) {
    const rawSvg = JSON.parse(sceneJson);

    // Ensure builders are registered before use
    if (defaultRegistry.size === 0) registerAllBuilders();

    // Scene metadata
    const sceneModel = new SceneModel({
      file_format_version: parseInt(rawSvg['@_krb:version'] || '1', 10),
      uuid: rawSvg['@_krb:uuid'],
      width: parseFloat(rawSvg['@_width'] || '1024'),
      height: parseFloat(rawSvg['@_height'] || '768'),
    });

    // Parse and build element tree
    const parsed = parseSceneChildren(rawSvg);

    if (Array.isArray(parsed)) {
      for (const childJson of parsed) {
        const built = this.buildElement(childJson);
        if (built) sceneModel.addChild(built);
      }
    }

    this._sceneModel = sceneModel;

    // Flatten tree into list (used by canvas renderer)
    this._flatElements = [];
    for (const child of this._sceneModel.children) {
      this.flattenInto(this._flatElements, child, 0, 0);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Flat element list for absolute canvas rendering */
  get sceneElements(): BaseSceneElementModel[] {
    return this._flatElements;
  }

  /** Hierarchical element tree for recursive rendering */
  get elements(): BaseSceneElementModel[] {
    return this._sceneModel.children;
  }

  get width(): number {
    return this._sceneModel.width;
  }

  get height(): number {
    return this._sceneModel.height;
  }

  toJSON() {
    return this._sceneModel.toJSON();
  }

  // ---------------------------------------------------------------------------
  // Internal: builder lookup + instantiation
  // ---------------------------------------------------------------------------

  private buildElement(jsonElement: any): BaseSceneElementModel | null {
    const key = resolveRegistryKey(jsonElement);
    if (!key) {
      console.warn('Unable to resolve registry key:', jsonElement);
      return null;
    }

    const builder = defaultRegistry.get(key);
    if (!builder) {
      console.warn(`No builder registered for key: ${key}`);
      return null;
    }

    return builder(jsonElement) || null;
  }

  // ---------------------------------------------------------------------------
  // Internal: tree flattener
  // ---------------------------------------------------------------------------

  /**
   * Recursively flattens a layout hierarchy into absolute-positioned elements.
   * Passes offsetX/Y but keeps absolute coordinates for canvas compatibility.
   */
  private flattenInto(
    out: BaseSceneElementModel[],
    node: BaseSceneElementModel,
    offsetX: number,
    offsetY: number
  ) {
    const adjusted = this.withOffset(node, offsetX, offsetY);
    out.push(adjusted);

    if (node instanceof BaseLayoutElementModel) {
      //const nx = offsetX + node.x;
      //const ny = offsetY + node.y;

      // Keep absolute coordinates for existing canvas renderer
      for (const child of node.children) {
        this.flattenInto(out, child, 0, 0);
      }
      // To switch to relative-to-layout coords, replace 0,0 with nx,ny
    }
  }

  /**
   * Returns a shallow clone of the element with x/y offsets applied.
   * Retains prototype chain and attached React component.
   */
  private withOffset<T extends BaseSceneElementModel>(
    el: T,
    dx: number,
    dy: number
  ): T {
    const hasX =
      Object.prototype.hasOwnProperty.call(el, 'x') &&
      typeof (el as any).x === 'number';
    const hasY =
      Object.prototype.hasOwnProperty.call(el, 'y') &&
      typeof (el as any).y === 'number';
    if (!hasX && !hasY) return el;

    const clone = Object.create(Object.getPrototypeOf(el)) as T;
    for (const k of Object.keys(el) as (keyof T)[]) {
      (clone as any)[k] = (el as any)[k];
    }

    if (hasX) (clone as any).x = (el as any).x + dx;
    if (hasY) (clone as any).y = (el as any).y + dy;
    return clone;
  }
}
