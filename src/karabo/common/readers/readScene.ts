/**
 * readScene — XML → SceneModel
 *
 * Parses a Karabo SVG string, sets the registry version,
 * and delegates to readElement for the rest.
 */

import { XMLParser } from 'fast-xml-parser';
import { readElement, readerRegistry } from '@/karabo/common/registry';
import { SceneModel } from '@/karabo/common/models/SceneModel';
import {
  ATTR_KRB_VERSION,
  SCENE_FILE_VERSION,
  SVG_SVG,
} from '@/karabo/common/constants';
import { toNum } from './util';

// Bootstrap all readers (side-effect imports register them)
import './index';

// XML Parser configured for Karabo SVG
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
