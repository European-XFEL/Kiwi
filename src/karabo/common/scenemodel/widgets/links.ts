/**
 * Link widget models — scene navigation and web links.
 */

import { BaseLinkModel, BaseSceneLinkModel } from '../bases';
import { registerReader } from '../Registry';
import { readBaseLinkData, readBaseSceneLinkData } from '../util';

// DeviceSceneLink
// ----------------------------------------------------------------------------

export class DeviceSceneLinkModel extends BaseSceneLinkModel {
  klass = 'DeviceSceneLink';
}

registerReader('DeviceSceneLink', (element) => {
  const model = new DeviceSceneLinkModel();
  readBaseSceneLinkData(element, model);
  return model;
});

// SceneLink
// ----------------------------------------------------------------------------

/** Links to another scene by path — opens in a tab or dialog. */
export class SceneLinkModel extends BaseSceneLinkModel {
  klass = 'SceneLink';
}

registerReader('SceneLink', (element) => {
  const model = new SceneLinkModel();
  readBaseSceneLinkData(element, model);
  return model;
});

// WebLink
// ----------------------------------------------------------------------------

/** Opens a URL in the browser. */
export class WebLinkModel extends BaseLinkModel {
  klass = 'WebLink';
}

registerReader('WebLink', (element) => {
  const model = new WebLinkModel();
  readBaseLinkData(element, model);
  return model;
});
