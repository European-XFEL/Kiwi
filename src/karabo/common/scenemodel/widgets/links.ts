/**
 * Link widget models — scene navigation and web links.
 */

import { BaseLinkModel } from '../bases';
import { registerReader } from '../Registry';
import { readBaseLinkData, toStr } from '../util';

// DeviceSceneLink
// ----------------------------------------------------------------------------

export class DeviceSceneLinkModel extends BaseLinkModel {
  klass = 'DeviceSceneLink';
  target_window: 'mainwin' | 'dialog' = 'dialog';
}

registerReader('DeviceSceneLink', (json) => {
  const model = new DeviceSceneLinkModel();
  readBaseLinkData(json, model);
  return model;
});

// SceneLink
// ----------------------------------------------------------------------------

/** Links to another scene by path — opens in a tab or dialog. */
export class SceneLinkModel extends BaseLinkModel {
  klass = 'SceneLink';
  target_window: 'mainwin' | 'dialog' = 'dialog';
}

registerReader('SceneLink', (json) => {
  const model = new SceneLinkModel();
  readBaseLinkData(json, model);
  const tw = toStr(json['@_krb:target_window']);
  if (tw === 'mainwin' || tw === 'dialog') model.target_window = tw;
  return model;
});

// WebLink
// ----------------------------------------------------------------------------

/** Opens a URL in the browser. */
export class WebLinkModel extends BaseLinkModel {
  klass = 'WebLink';
}

registerReader('WebLink', (json) => {
  const model = new WebLinkModel();
  readBaseLinkData(json, model);
  return model;
});
