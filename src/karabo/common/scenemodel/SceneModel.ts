/** SceneModel — root container for a Karabo scene. */

import { BaseSceneObjectData } from './bases';

import { XMLParser } from 'fast-xml-parser';
import { readElement, readerRegistry } from './Registry';
import { ATTR_KRB_VERSION, SCENE_FILE_VERSION, SVG_SVG } from './constants';
import { toNum } from './util';

export class SceneModel extends BaseSceneObjectData {
  simple_name = '';
  uuid = '';

  width = 1024;
  height = 768;
  file_format_version = 2;

  /** Preserves unknown SVG attributes for round-trip fidelity. */
  extra_attributes: Record<string, string> = {};

  children: BaseSceneObjectData[] = [];
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
});

/** Locate the svg root in the parsed XML object and return it with its tag. */
function extractSvgRoot(
  xmlObj: Record<string, unknown>
): { root: Record<string, unknown>; tag: string } | undefined {
  // Direct root
  for (const tag of [SVG_SVG, 'svg']) {
    if (xmlObj[tag])
      return { root: xmlObj[tag] as Record<string, unknown>, tag };
  }

  // Wrapped roots (e.g. project DB xml)
  const inner = xmlObj['xml'] as Record<string, unknown> | undefined;
  if (inner) {
    for (const tag of [SVG_SVG, 'svg']) {
      if (inner[tag])
        return { root: inner[tag] as Record<string, unknown>, tag };
    }
  }

  return undefined;
}

export function readScene(xml: string): SceneModel {
  const xmlObj = xmlParser.parse(xml) as Record<string, unknown>;
  const result = extractSvgRoot(xmlObj);

  if (!result) {
    console.warn('[readScene] Unable to locate svg root');
    return new SceneModel();
  }

  const { root, tag } = result;

  // Set scene version before reading — readers use this for version dispatch
  readerRegistry.version = toNum(root[ATTR_KRB_VERSION], SCENE_FILE_VERSION);

  return readElement(root, tag) as SceneModel;
}

/** Build a SceneModel from an already-parsed SVG JSON object.
 *  Used by ProjectDBConnector to avoid re-parsing XML on cache hits. */
export function readSceneFromSvgJson(
  svgJson: Record<string, unknown>
): SceneModel {
  readerRegistry.version = toNum(svgJson[ATTR_KRB_VERSION], SCENE_FILE_VERSION);
  return readElement(svgJson, SVG_SVG) as SceneModel;
}
