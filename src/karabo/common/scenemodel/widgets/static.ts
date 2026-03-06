/**
 * Static widget models — no controller wrapping, no device listening.
 *
 */

import { BaseWidgetObjectData } from '../bases';
import { FONT_DEFAULT } from '../constants';

import { registerReader } from '../Registry';
import { readBaseWidgetData, toNum, toStr } from '../util';

// Label
// ----------------------------------------------------------------------------

/** Static text label. No device binding, no controller wrapper. */
export class LabelModel extends BaseWidgetObjectData {
  klass = 'Label';
  text = '';
  font: string = FONT_DEFAULT;
  foreground = '';
  background = 'transparent';
  frame_width = 0;
  alignh: 1 | 2 | 4 = 1;
}

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

/** Multiline text label with a full font descriptor. No device binding. */
export class StickerModel extends BaseWidgetObjectData {
  klass = 'Sticker';
  text = '';
  font: string = FONT_DEFAULT;
  foreground = '';
  background = 'white';
}

registerReader('Sticker', (json) => {
  const sticker = new StickerModel();

  readBaseWidgetData(json, sticker);
  sticker.text = toStr(json['@_krb:text']);
  sticker.foreground = toStr(json['@_krb:foreground']);
  sticker.background = toStr(json['@_krb:background'], sticker.background);
  sticker.font = toStr(json['@_krb:font'], sticker.font);

  return sticker;
});
