/** SceneModel — root container for a Karabo scene. */

import { BaseSceneObjectData } from './bases';

import { readElement, readerRegistry } from './Registry';
import { ATTR_KRB_VERSION, SCENE_FILE_VERSION, SVG_SVG } from './constants';
import { krbAttr, toNum } from './util';

export class SceneModel extends BaseSceneObjectData {
  constructor(init?: Partial<SceneModel>) {
    super();
    Object.assign(this, init);
  }
  svg = '';
  width = 1024;
  height = 768;
  file_format_version = 2;
  /** True when the scene has been initialized. */
  initialized = false;
  /** Preserves unknown SVG attributes for round-trip fidelity. */
  extra_attributes: Record<string, string> = {};

  children: BaseSceneObjectData[] = [];
}

/** Locate the svg root in the parsed XML document. */
function extractSvgRoot(document: Document): Element | undefined {
  const root = document.documentElement;
  if (isSvgRoot(root)) return root;

  return Array.from(root.children).find(isSvgRoot);
}

function isSvgRoot(element: Element): boolean {
  return element.tagName === SVG_SVG || element.tagName === 'svg';
}

export function readScene(xml: string): SceneModel {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = document.querySelector('parsererror');
  const root = parserError ? undefined : extractSvgRoot(document);

  if (!root) {
    console.warn('[readScene] Unable to locate svg root');
    return new SceneModel();
  }

  return readSceneFromSvgElement(root);
}

/** Build a SceneModel from an already-parsed SVG element. */
export function readSceneFromSvgElement(svgElement: Element): SceneModel {
  // Set scene version before reading — readers use this for version dispatch.
  readerRegistry.version = toNum(
    krbAttr(svgElement, ATTR_KRB_VERSION),
    SCENE_FILE_VERSION
  );

  return readElement(svgElement, svgElement.tagName) as SceneModel;
}
