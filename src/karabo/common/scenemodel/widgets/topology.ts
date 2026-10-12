import { BaseWidgetObjectData } from '../bases';
import { registerReader } from '../Registry';
import { readBaseWidgetData } from '../util';

export class InstanceStatusModel extends BaseWidgetObjectData {
  klass = 'InstanceStatus';
}

registerReader('InstanceStatus', (element) => {
  const model = new InstanceStatusModel();
  readBaseWidgetData(element, model);
  return model;
});
