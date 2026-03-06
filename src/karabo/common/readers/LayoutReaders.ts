/**
 * Layout readers — BoxLayout, FixedLayout, GridLayout.
 */

import { registerReader, readElement } from '@/karabo/common/registry';
import {
  BoxLayoutModel,
  Direction,
  FixedLayoutModel,
  GridLayoutModel,
} from '@/karabo/common/models';
import { GridLayoutChildData } from '@/karabo/common/models/bases';
import {
  readBaseLayoutData,
  readChildren,
  collectSvgChildren,
  toNum,
} from '@/karabo/common/readers/util';

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
// Each child carries its grid placement in krb:row/col/rowspan/colspan attrs.
// We read those and attach them as GridLayoutChildData on the child model.

registerReader('GridLayout', (json) => {
  const layout = new GridLayoutModel();

  readBaseLayoutData(json, layout);

  layout.children = collectSvgChildren(json).map(({ element, tag }) => {
    const child = readElement(element, tag);
    const ld = new GridLayoutChildData();
    ld.row = toNum(element['@_krb:row']);
    ld.col = toNum(element['@_krb:col']);
    ld.rowspan = toNum(element['@_krb:rowspan']) || 1;
    ld.colspan = toNum(element['@_krb:colspan']) || 1;
    child.layout_data = ld;
    return child;
  });

  return layout;
});
