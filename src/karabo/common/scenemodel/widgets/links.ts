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

registerReader('DeviceSceneLink', (element) => {
  const model = new DeviceSceneLinkModel();
  readBaseLinkData(element, model);
  return model;
});

// SceneLink
// ----------------------------------------------------------------------------

/** Links to another scene by path — opens in a tab or dialog. */
export class SceneLinkModel extends BaseLinkModel {
  klass = 'SceneLink';
  target_window: 'mainwin' | 'dialog' = 'dialog';
}

registerReader('SceneLink', (element) => {
  const model = new SceneLinkModel();
  readBaseLinkData(element, model);
  const tw = toStr(element['@_krb:target_window']);
  if (tw === 'mainwin' || tw === 'dialog') model.target_window = tw;
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
