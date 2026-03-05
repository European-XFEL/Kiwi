/**
 * Fallback readers — handle unrecognized widgets and unknown SVG elements.
 */

import { registerReader } from '../Registry';
import { UnknownWidgetDataModel, UnknownXMLDataModel } from '../models';
import { UNKNOWN_WIDGET_CLASS } from '../constants';
import { readBaseWidgetData, toStr } from './util';

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
