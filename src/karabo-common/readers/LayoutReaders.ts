/**
 * Layout readers — BoxLayout, FixedLayout, GridLayout.
 */

import { registerReader } from '@/karabo-common/registry';
import {
  BoxLayoutModel,
  Direction,
  FixedLayoutModel,
  GridLayoutModel,
} from '@/karabo-common/models';
import {
  readBaseLayoutData,
  readChildren,
  toNum,
} from '@/karabo-common/readers/util';

// BoxLayout
// ----------------------------------------------------------------------------

registerReader('BoxLayout', (json) => {
  const layout = new BoxLayoutModel();

  readBaseLayoutData(json, layout);
  layout.direction = toNum(json['@_krb:direction']) as Direction;
  layout.children = readChildren(json);

  return layout;
});

// FixedLayout
// ----------------------------------------------------------------------------

registerReader('FixedLayout', (json) => {
  const layout = new FixedLayoutModel();

  readBaseLayoutData(json, layout);
  layout.children = readChildren(json);

  return layout;
});

// GridLayout
// ----------------------------------------------------------------------------

registerReader('GridLayout', (json) => {
  const layout = new GridLayoutModel();

  readBaseLayoutData(json, layout);
  layout.children = readChildren(json);

  return layout;
});
