/**
 *
 * Root scene model class - represents the entire SVG canvas.
 */

import { BaseSceneElementModel } from "./BaseModels";
import type { SceneProps, SceneElementProps } from "../scene_types/scene";
import { buildElement } from "../scene_builders/BuilderFns";

/**
 * The root scene model - represents the entire <svg:svg> element.
 */
export class SceneModel {
  /** Scene file format version. */
  file_format_version = 2;

  /** Unique scene identifier (krb:uuid). */
  uuid?: string;

  /** Canvas width in pixels. */
  width = 1024;

  /** Canvas height in pixels. */
  height = 768;

  /** Top-level elements (layouts, shapes, widgets). */
  children: BaseSceneElementModel[] = [];

  /** Optional map of extra SVG attributes to preserve. */
  extra_attributes?: Record<string, string>;

  constructor(data?: Partial<SceneProps>) {
    if (data) {
      this.file_format_version = data.file_format_version ?? 2;
      this.uuid = data.uuid;
      this.width = data.width ?? 1024;
      this.height = data.height ?? 768;
      this.extra_attributes = data.extra_attributes;
    }
  }

  /**
   * Build a SceneModel instance from a serialized JSON string.
   * @param jsonString - JSON string representing a serialized SceneProps object.
   */
  static fromJSON(jsonString: string): SceneModel {
    const data = JSON.parse(jsonString) as SceneProps;
    const scene = new SceneModel({
      file_format_version: data.file_format_version,
      uuid: data.uuid,
      width: data.width,
      height: data.height,
      extra_attributes: data.extra_attributes,
    });

    // Build and attach child elements.
    if (Array.isArray(data.children)) {
      for (const childJson of data.children) {
        const child = buildElement(childJson);
        if (child) {
          scene.addChild(child);
        }
      }
    }

    return scene;
  }

  // ---------------------------------------------------------------------------
  // Core serialization
  // ---------------------------------------------------------------------------

  /** Serialize this model into render-ready props for React or JSON output. */
  get props(): SceneProps {
    return {
      file_format_version: this.file_format_version,
      uuid: this.uuid,
      width: this.width,
      height: this.height,
      children: this.children.map(
        (child) => child.props
      ) as SceneElementProps[],
      extra_attributes: this.extra_attributes,
    };
  }

  /** Convert to plain JSON object. */
  toJSON(): SceneProps {
    return this.props;
  }

  // ---------------------------------------------------------------------------
  // Child management
  // ---------------------------------------------------------------------------

  addChild(child: BaseSceneElementModel): void {
    this.children.push(child);
  }

  removeChild(child: BaseSceneElementModel): void {
    const index = this.children.indexOf(child);
    if (index > -1) this.children.splice(index, 1);
  }

  clearChildren(): void {
    this.children = [];
  }

  // ---------------------------------------------------------------------------
  // Traversal
  // ---------------------------------------------------------------------------

  /**
   * Traverse the entire scene tree depth-first, calling a visitor function.
   * @param visitor - Function called for each element with its depth.
   */
  traverse(
    visitor: (element: BaseSceneElementModel, depth: number) => void
  ): void {
    const walk = (element: BaseSceneElementModel, depth: number) => {
      visitor(element, depth);
      if ("children" in element && Array.isArray(element.children)) {
        (element.children as BaseSceneElementModel[]).forEach((child) =>
          walk(child, depth + 1)
        );
      }
    };

    this.children.forEach((child) => walk(child, 0));
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  generateUUID(): void {
    this.uuid = crypto.randomUUID();
  }
}
