/**
 * Scene reader — registered under "svg:svg" and "svg" tags.
 *
 * Python Karabo registers the Scene reader under both namespace-prefixed
 * ("svg:svg") and plain ("svg") tags. We mirror that here so the registry
 * can resolve either form directly.
 */

import { registerReader } from '@/karabo-common/registry';
import { SceneModel } from '@/karabo-common/models/SceneModel';
import {
  ATTR_HEIGHT,
  ATTR_KRB_UUID,
  ATTR_KRB_VERSION,
  SCENE_FILE_VERSION,
  ATTR_WIDTH,
  SVG_SVG,
} from '@/karabo-common/constants';
import { readChildren, toNum, toStr } from './util';

// Scene
// ----------------------------------------------------------------------------

function readScene(json: Record<string, unknown>): SceneModel {
  const scene = new SceneModel();

  scene.file_format_version = toNum(json[ATTR_KRB_VERSION], SCENE_FILE_VERSION);
  scene.uuid = toStr(json[ATTR_KRB_UUID]);
  scene.width = toNum(json[ATTR_WIDTH], scene.width);
  scene.height = toNum(json[ATTR_HEIGHT], scene.height);
  scene.children = readChildren(json);

  return scene;
}

// Register under both "svg:svg" (namespace-prefixed) and "svg" (plain)
registerReader('Scene', readScene, SVG_SVG);
registerReader('Scene', readScene, 'svg');
