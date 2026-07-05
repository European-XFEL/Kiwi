/** SceneModel — root container for a Karabo scene. */

import { BaseSceneObjectData } from './bases';
import { readElement, readerRegistry } from './Registry';
import { ATTR_KRB_VERSION, SCENE_FILE_VERSION, SVG_SVG } from './constants';
import { toNum } from './util';

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

type ParsedSceneElement = Record<string, unknown> & {
  __tag__: string;
};

function normalizeTagName(element: Element): string {
  const localName = element.localName || element.tagName;
  return element.prefix ? `${element.prefix}:${localName}` : localName;
}

function isSvgElement(element: Element | null | undefined): element is Element {
  if (!element) return false;
  const tag = normalizeTagName(element);
  return tag === SVG_SVG || tag === 'svg';
}

function elementToParsedSceneElement(
  element: Element,
  tag = normalizeTagName(element)
): ParsedSceneElement {
  const parsed: ParsedSceneElement = { __tag__: tag };

  const attributes = element.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    parsed[`@_${attribute.name}`] = attribute.value;
  }

  const children = element.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childTag = normalizeTagName(child);
    const parsedChild = elementToParsedSceneElement(child, childTag);
    const existing = parsed[childTag];

    if (existing === undefined) {
      parsed[childTag] = parsedChild;
    } else if (Array.isArray(existing)) {
      existing.push(parsedChild);
    } else {
      parsed[childTag] = [existing, parsedChild];
    }
  }

  return parsed;
}

function extractSvgRoot(doc: Document): Element | undefined {
  const root = doc.documentElement;
  if (isSvgElement(root)) {
    return root;
  }

  const allElements = doc.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const element = allElements[i];
    if (isSvgElement(element)) {
      return element;
    }
  }

  return undefined;
}

export function readScene(xml: string): SceneModel {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const docElement = doc.documentElement;

  if (!docElement || docElement.localName === 'parsererror') {
    console.warn('[readScene] Unable to parse xml');
    return new SceneModel();
  }

  const root = extractSvgRoot(doc);
  if (!root) {
    console.warn('[readScene] Unable to locate svg root');
    return new SceneModel();
  }

  const element = elementToParsedSceneElement(root);
  const tag = element.__tag__ || SVG_SVG;

  readerRegistry.version = toNum(element[ATTR_KRB_VERSION], SCENE_FILE_VERSION);
  return readElement(element, tag) as SceneModel;
}
