/**
 * Link widget readers — DeviceSceneLink, SceneLink, WebLink.
 */

import { registerReader } from '../Registry';
import { DeviceSceneLinkModel, SceneLinkModel, WebLinkModel } from '../models';
import { readBaseLinkData, toStr } from '../readers/util';

// DeviceSceneLink
// ----------------------------------------------------------------------------

registerReader('DeviceSceneLink', (json) => {
  const model = new DeviceSceneLinkModel();
  readBaseLinkData(json, model);
  return model;
});

// SceneLink
// ----------------------------------------------------------------------------

registerReader('SceneLink', (json) => {
  const model = new SceneLinkModel();
  readBaseLinkData(json, model);
  const tw = toStr(json['@_krb:target_window']);
  if (tw === 'mainwin' || tw === 'dialog') model.target_window = tw;
  return model;
});

// WebLink
// ----------------------------------------------------------------------------

registerReader('WebLink', (json) => {
  const model = new WebLinkModel();
  readBaseLinkData(json, model);
  return model;
});
