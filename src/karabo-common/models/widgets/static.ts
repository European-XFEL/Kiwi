/**
 * Static widget models — no controller wrapping, no device listening.
 *
 */

import { BaseLabelModel } from '../bases';

// Label
// ----------------------------------------------------------------------------

/** Static text label. No device binding, no controller wrapper. */
export class LabelModel extends BaseLabelModel {
  klass = 'Label';
  text = '';
  background = '#FFFFFF';
  foreground = '#000000';
  frame_width = 0;
  text_decoration = 'none';
  alignment: 'left' | 'center' | 'right' = 'left';
}
