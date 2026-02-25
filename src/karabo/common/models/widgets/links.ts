/**
 * Link widget models — scene navigation and web links.
 */

import { BaseLinkModel } from '../bases';

// DeviceSceneLink
// ----------------------------------------------------------------------------

/** Deprecated. Opens a scene associated with a device (always in a dialog). */
export class DeviceSceneLinkModel extends BaseLinkModel {
  klass = 'DeviceSceneLink';
  target_window: 'mainwin' | 'dialog' = 'dialog';
}

// SceneLink
// ----------------------------------------------------------------------------

/** Links to another scene by path — opens in a tab or dialog. */
export class SceneLinkModel extends BaseLinkModel {
  klass = 'SceneLink';
  target_window: 'mainwin' | 'dialog' = 'dialog';
}

// WebLink
// ----------------------------------------------------------------------------

/** Opens a URL in the browser. */
export class WebLinkModel extends BaseLinkModel {
  klass = 'WebLink';
}
