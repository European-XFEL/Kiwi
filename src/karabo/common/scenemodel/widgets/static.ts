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

registerReader('Label', (element) => {
  const label = new LabelModel();

  readBaseWidgetData(element, label);

  // Content and appearance
  label.text = toStr(element['@_krb:text']);
  label.foreground = toStr(element['@_krb:foreground'], '#000000');
  label.background = toStr(element['@_krb:background'], '#FFFFFF');
  label.frame_width = toNum(element['@_krb:frameWidth']);

  const alignh = toNum(element['@_krb:alignh'], 1);
  if (alignh === 2 || alignh === 4) label.alignh = alignh;

  label.font = toStr(element['@_krb:font'], label.font);

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

registerReader('Sticker', (element) => {
  const sticker = new StickerModel();

  readBaseWidgetData(element, sticker);
  sticker.text = toStr(element['@_krb:text']);
  sticker.foreground = toStr(element['@_krb:foreground']);
  sticker.background = toStr(element['@_krb:background'], sticker.background);
  sticker.font = toStr(element['@_krb:font'], sticker.font);

  return sticker;
});
