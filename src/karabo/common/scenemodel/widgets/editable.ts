/**
 * Editable controller widget models.
 *
 * All extend BaseEditWidget (→ BaseWidgetObjectData).
 * All default to parent_component = 'EditableApplyLaterComponent'.
 */

import { BaseEditWidget } from '../bases';
import { FONT_SIZE_DEFAULT } from '../constants';
import { registerReader } from '../Registry';

import { krbAttr, readBaseWidgetData, toBool, toNum } from '../util';

// EditableComboBox
// ----------------------------------------------------------------------------

export class EditableComboBoxModel extends BaseEditWidget {
  klass = 'EditableComboBox';
}

registerReader('EditableComboBox', (element) => {
  const combo = new EditableComboBoxModel();

  readBaseWidgetData(element, combo);

  return combo;
});

// EditableList
// ----------------------------------------------------------------------------

export class EditableListModel extends BaseEditWidget {
  klass = 'EditableList';
}

registerReader('EditableList', (element) => {
  const list = new EditableListModel();

  readBaseWidgetData(element, list);

  return list;
});

// EditableRegexList
// ----------------------------------------------------------------------------

export class EditableRegexListModel extends BaseEditWidget {
  klass = 'EditableRegexList';
}

registerReader('EditableRegexList', (element) => {
  const list = new EditableRegexListModel();

  readBaseWidgetData(element, list);

  return list;
});

// EditableListElement
// ----------------------------------------------------------------------------

export class EditableListElementModel extends BaseEditWidget {
  klass = 'EditableListElement';
}

registerReader('EditableListElement', (element) => {
  const model = new EditableListElementModel();

  readBaseWidgetData(element, model);

  return model;
});

// EditableSpinBox
// ----------------------------------------------------------------------------

export class EditableSpinBoxModel extends BaseEditWidget {
  klass = 'EditableSpinBox';
  font_size = FONT_SIZE_DEFAULT;
  font_weight: 'normal' | 'bold' = 'normal';
}

registerReader('EditableSpinBox', (element) => {
  const spinbox = new EditableSpinBoxModel();

  readBaseWidgetData(element, spinbox);

  return spinbox;
});

// EditableRegex (Python: EditableRegexModel)
// ----------------------------------------------------------------------------

export class EditableRegexModel extends BaseEditWidget {
  klass = 'EditableRegex';
}

registerReader('EditableRegex', (element) => {
  const regex = new EditableRegexModel();

  readBaseWidgetData(element, regex);

  return regex;
});

// Hexadecimal
// ----------------------------------------------------------------------------

export class HexadecimalModel extends BaseEditWidget {
  klass = 'Hexadecimal';
}

registerReader('Hexadecimal', (element) => {
  const hex = new HexadecimalModel();

  readBaseWidgetData(element, hex);

  return hex;
});

// IntLineEdit
// ----------------------------------------------------------------------------

export class IntLineEditModel extends BaseEditWidget {
  klass = 'IntLineEdit';
}

registerReader('IntLineEdit', (element) => {
  const intEdit = new IntLineEditModel();

  readBaseWidgetData(element, intEdit);

  return intEdit;
});

// DoubleLineEdit
// ----------------------------------------------------------------------------

export class DoubleLineEditModel extends BaseEditWidget {
  klass = 'DoubleLineEdit';
  decimals = -1;
}

registerReader('DoubleLineEdit', (element) => {
  const doubleEdit = new DoubleLineEditModel();

  readBaseWidgetData(element, doubleEdit);
  doubleEdit.decimals = toNum(krbAttr(element, 'decimals'), -1);

  return doubleEdit;
});

// TickSlider
// ----------------------------------------------------------------------------

export class TickSliderModel extends BaseEditWidget {
  klass = 'TickSlider';
  ticks = 1;
  show_value = true;
}

registerReader('TickSlider', (element) => {
  const slider = new TickSliderModel();

  readBaseWidgetData(element, slider);
  slider.ticks = toNum(krbAttr(element, 'ticks'), 1);
  slider.show_value = toBool(krbAttr(element, 'show_value'), true);

  return slider;
});

// FloatSpinBox
// ----------------------------------------------------------------------------

export class FloatSpinBoxModel extends BaseEditWidget {
  klass = 'FloatSpinBox';
  step = 0;
  decimals = 3;
  font_size = FONT_SIZE_DEFAULT;
  font_weight: 'normal' | 'bold' = 'normal';
}

registerReader('FloatSpinBox', (element) => {
  const spinbox = new FloatSpinBoxModel();

  readBaseWidgetData(element, spinbox);
  spinbox.step = toNum(krbAttr(element, 'step'));
  spinbox.decimals = toNum(krbAttr(element, 'decimals'), 3);

  return spinbox;
});
