/**
 * Scene reader — registered under "svg:svg" and "svg" tags.
 *
 * Python Karabo registers the Scene reader under both namespace-prefixed
 * ("svg:svg") and plain ("svg") tags. We mirror that here so the registry
 * can resolve either form directly.
 */

import { registerReader } from './Registry';
import { SceneModel } from './SceneModel';
import {
  ATTR_HEIGHT,
  ATTR_KRB_UUID,
  ATTR_KRB_VERSION,
  SCENE_FILE_VERSION,
  ATTR_WIDTH,
  SVG_SVG,
  UNKNOWN_WIDGET_CLASS,
} from './constants';
import {
  krbAttr,
  xmlAttr,
  attributesToRecord,
  readBaseWidgetData,
  readChildren,
  toNum,
  toStr,
} from './util';
import { UnknownWidgetDataModel, UnknownXMLDataModel } from './bases';

// Scene
// ----------------------------------------------------------------------------

function sceneReader(element: Element): SceneModel {
  const scene = new SceneModel();

  scene.file_format_version = toNum(
    krbAttr(element, ATTR_KRB_VERSION),
    SCENE_FILE_VERSION
  );
  scene.uuid = toStr(krbAttr(element, ATTR_KRB_UUID));
  scene.width = toNum(xmlAttr(element, ATTR_WIDTH), scene.width);
  scene.height = toNum(xmlAttr(element, ATTR_HEIGHT), scene.height);
  scene.children = readChildren(element);

  return scene;
}

// Register under both "svg:svg" (namespace-prefixed) and "svg" (plain)
registerReader('Scene', sceneReader, SVG_SVG);
registerReader('Scene', sceneReader, 'svg');

// Unknown Widget
// ----------------------------------------------------------------------------

registerReader(UNKNOWN_WIDGET_CLASS, (element) => {
  const model = new UnknownWidgetDataModel();

  readBaseWidgetData(element, model);
  model.attributes = attributesToRecord(element);

  return model;
});

// Unknown XML Element (wildcard catch-all)
// ----------------------------------------------------------------------------

registerReader('*', (element) => {
  const model = new UnknownXMLDataModel();

  model.tag = element.tagName;
  model.attributes = attributesToRecord(element);
  model.children = readChildren(element);

  return model;
});
