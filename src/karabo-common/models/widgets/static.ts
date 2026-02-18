/**
 * Static widget models — no controller wrapping, no device listening.
 *
 */

import { BaseWidgetObjectData } from '../bases';
import { FONT_DEFAULT } from '../../constants';

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
