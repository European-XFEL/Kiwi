/**
 * Scene reader — registered under "svg:svg" and "svg" tags.
 *
 * Python Karabo registers the Scene reader under both namespace-prefixed
 * ("svg:svg") and plain ("svg") tags. We mirror that here so the registry
 * can resolve either form directly.
 */

import { registerReader } from '../Registry';
import { SceneModel } from '../models/SceneModel';
import {
  ATTR_HEIGHT,
  ATTR_KRB_UUID,
  ATTR_KRB_VERSION,
  SCENE_FILE_VERSION,
  ATTR_WIDTH,
  SVG_SVG,
  UNKNOWN_WIDGET_CLASS,
} from '../constants';
import { readChildren, toNum, toStr, readBaseWidgetData } from './util';
import { UnknownWidgetDataModel, UnknownXMLDataModel } from './bases';

// Scene
// ----------------------------------------------------------------------------

function sceneReader(json: Record<string, unknown>): SceneModel {
  const scene = new SceneModel();

  scene.file_format_version = toNum(json[ATTR_KRB_VERSION], SCENE_FILE_VERSION);
  scene.uuid = toStr(json[ATTR_KRB_UUID]);
  scene.width = toNum(json[ATTR_WIDTH], scene.width);
  scene.height = toNum(json[ATTR_HEIGHT], scene.height);
  scene.children = readChildren(json);

  return scene;
}

// Register under both "svg:svg" (namespace-prefixed) and "svg" (plain)
registerReader('Scene', sceneReader, SVG_SVG);
registerReader('Scene', sceneReader, 'svg');

// Unknown Widget
// ----------------------------------------------------------------------------

registerReader(UNKNOWN_WIDGET_CLASS, (json) => {
  const model = new UnknownWidgetDataModel();

  readBaseWidgetData(json, model);

  // Preserve all raw XML attributes for round-trip.
  // Keys with "@_" prefix are attributes (from attributeNamePrefix config),
  // other keys are child elements (svg:rect, svg:g, etc.) or parser internals.
  const attributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json)) {
    if (key.startsWith('@_')) {
      attributes[key] = value;
    }
  }
  model.attributes = attributes;

  return model;
});

// Unknown XML Element (wildcard catch-all)
// ----------------------------------------------------------------------------

registerReader('*', (json) => {
  const model = new UnknownXMLDataModel();

  model.tag = toStr(json.__tag__);

  // Only XML attributes — child elements and parser keys are excluded.
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(json)) {
    if (key.startsWith('@_')) {
      attributes[key] = String(value);
    }
  }
  model.attributes = attributes;

  return model;
});
