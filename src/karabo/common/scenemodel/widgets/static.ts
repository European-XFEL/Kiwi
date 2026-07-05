/**
 * Static widget models — no controller wrapping, no device listening.
 *
 */

import { BaseWidgetObjectData } from '../bases';
import { FONT_DEFAULT } from '../constants';

import { registerReader } from '../Registry';
import { krbAttr, readBaseWidgetData, toNum, toStr } from '../util';

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
  label.text = toStr(krbAttr(element, 'text'));
  label.foreground = toStr(krbAttr(element, 'foreground'), '#000000');
  label.background = toStr(krbAttr(element, 'background'), '#FFFFFF');
  label.frame_width = toNum(krbAttr(element, 'frameWidth'));

  const alignh = toNum(krbAttr(element, 'alignh'), 1);
  if (alignh === 2 || alignh === 4) label.alignh = alignh;

  label.font = toStr(krbAttr(element, 'font'), label.font);

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
  sticker.text = toStr(krbAttr(element, 'text'));
  sticker.foreground = toStr(krbAttr(element, 'foreground'));
  sticker.background = toStr(
    krbAttr(element, 'background'),
    sticker.background
  );
  sticker.font = toStr(krbAttr(element, 'font'), sticker.font);

  return sticker;
});
