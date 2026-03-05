/**
 * Static widget readers — Label, Sticker.
 */

import { registerReader } from '../Registry';
import { LabelModel, StickerModel } from '../models';
import { readBaseWidgetData, toNum, toStr } from '../readers/util';

// Label
// ----------------------------------------------------------------------------

registerReader('Label', (json) => {
  const label = new LabelModel();

  readBaseWidgetData(json, label);

  // Content and appearance
  label.text = toStr(json['@_krb:text']);
  label.foreground = toStr(json['@_krb:foreground'], '#000000');
  label.background = toStr(json['@_krb:background'], '#FFFFFF');
  label.frame_width = toNum(json['@_krb:frameWidth']);

  const alignh = toNum(json['@_krb:alignh'], 1);
  if (alignh === 2 || alignh === 4) label.alignh = alignh;

  label.font = toStr(json['@_krb:font'], label.font);

  return label;
});

// Sticker
// ----------------------------------------------------------------------------

registerReader('Sticker', (json) => {
  const sticker = new StickerModel();

  readBaseWidgetData(json, sticker);
  sticker.text = toStr(json['@_krb:text']);
  sticker.foreground = toStr(json['@_krb:foreground']);
  sticker.background = toStr(json['@_krb:background'], sticker.background);
  sticker.font = toStr(json['@_krb:font'], sticker.font);

  return sticker;
});
