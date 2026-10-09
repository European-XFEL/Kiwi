import { BaseWidgetObjectData } from '../bases';
import { registerReader } from '../Registry';
import { krbAttr, readBaseWidgetData, toStr } from '../util';

export class WebCamGraphModel extends BaseWidgetObjectData {
  klass = 'WebCamGraph';
  colormap = 'none';
}

// ImageGraph temporarily uses the webcam renderer and its image settings.
export class ImageGraphModel extends WebCamGraphModel {
  klass = 'ImageGraph';
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
registerReader('ImageGraph', (element) =>
  readImageGraph(element, new ImageGraphModel())
);
registerReader('DetectorGraph', (element) =>
  readImageGraph(element, new DetectorGraphModel())
);
