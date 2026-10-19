import { BaseWidgetObjectData } from '../bases';
import { registerReader } from '../Registry';
import { krbAttr, readBaseWidgetData, toNum, toStr } from '../util';

export class WebCamGraphModel extends BaseWidgetObjectData {
  klass = 'WebCamGraph';
  colormap = 'none';
}

export class ImageGraphModel extends WebCamGraphModel {
  klass = 'ImageGraph';
  x_label = 'X-axis';
  y_label = 'Y-axis';
  x_units = 'pixels';
  y_units = 'pixels';
  x_scale = 1;
  y_scale = 1;
  x_translate = 0;
  y_translate = 0;
  aspect_ratio = 1;
  show_scale = true;
  color_levels: number[] = [];
}

export class DetectorGraphModel extends WebCamGraphModel {
  klass = 'DetectorGraph';
}

function readImageGraph(element: Element, model = new WebCamGraphModel()) {
  readBaseWidgetData(element, model);
  model.colormap = toStr(krbAttr(element, 'colormap'), 'viridis');
  return model;
}

registerReader('WebCamGraph', readImageGraph);
registerReader('ImageGraph', (element) => {
  const model = new ImageGraphModel();
  readImageGraph(element, model);
  for (const key of ['x_label', 'y_label', 'x_units', 'y_units'] as const) {
    model[key] = toStr(krbAttr(element, key), model[key]);
  }
  for (const key of [
    'x_scale',
    'y_scale',
    'x_translate',
    'y_translate',
    'aspect_ratio',
  ] as const) {
    model[key] = toNum(krbAttr(element, key), model[key]);
  }
  model.show_scale = toNum(krbAttr(element, 'show_scale'), 1) !== 0;
  const levels = toStr(krbAttr(element, 'color_levels'));
  const parsed = levels.split(',').map(Number);
  if (
    levels &&
    parsed.length === 2 &&
    parsed.every(Number.isFinite) &&
    parsed[0] <= parsed[1]
  ) {
    model.color_levels = parsed;
  }
  return model;
});
registerReader('DetectorGraph', (element) =>
  readImageGraph(element, new DetectorGraphModel())
);
