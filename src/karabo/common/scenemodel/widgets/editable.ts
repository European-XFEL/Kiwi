/**
 * Editable controller widget models.
 *
 * All extend BaseEditWidget (→ BaseWidgetObjectData).
 * All default to parent_component = 'EditableApplyLaterComponent'.
 */

import { BaseEditWidget } from '../bases';
import { FONT_SIZE_DEFAULT } from '../constants';
import { registerReader } from '../Registry';

import { readBaseWidgetData, toBool, toNum } from '../util';

// EditableComboBox
// ----------------------------------------------------------------------------

export class EditableComboBoxModel extends BaseEditWidget {
  klass = 'EditableComboBox';
}

registerReader('EditableComboBox', (json) => {
  const combo = new EditableComboBoxModel();

  readBaseWidgetData(json, combo);

  return combo;
});

// EditableList
// ----------------------------------------------------------------------------

export class EditableListModel extends BaseEditWidget {
  klass = 'EditableList';
}

registerReader('EditableList', (json) => {
  const list = new EditableListModel();

  readBaseWidgetData(json, list);

  return list;
});

// EditableRegexList
// ----------------------------------------------------------------------------

export class EditableRegexListModel extends BaseEditWidget {
  klass = 'EditableRegexList';
}

registerReader('EditableRegexList', (json) => {
  const list = new EditableRegexListModel();

  readBaseWidgetData(json, list);

  return list;
});

// EditableListElement
// ----------------------------------------------------------------------------

export class EditableListElementModel extends BaseEditWidget {
  klass = 'EditableListElement';
}

registerReader('EditableListElement', (json) => {
  const element = new EditableListElementModel();

  readBaseWidgetData(json, element);

  return element;
});

// EditableSpinBox
// ----------------------------------------------------------------------------

export class EditableSpinBoxModel extends BaseEditWidget {
  klass = 'EditableSpinBox';
  font_size = FONT_SIZE_DEFAULT;
  font_weight: 'normal' | 'bold' = 'normal';
}

registerReader('EditableSpinBox', (json) => {
  const spinbox = new EditableSpinBoxModel();

  readBaseWidgetData(json, spinbox);

  return spinbox;
});

// EditableRegex (Python: EditableRegexModel)
// ----------------------------------------------------------------------------

export class EditableRegexModel extends BaseEditWidget {
  klass = 'EditableRegex';
}

registerReader('EditableRegex', (json) => {
  const regex = new EditableRegexModel();

  readBaseWidgetData(json, regex);

  return regex;
});

// Hexadecimal
// ----------------------------------------------------------------------------

export class HexadecimalModel extends BaseEditWidget {
  klass = 'Hexadecimal';
}

registerReader('Hexadecimal', (json) => {
  const hex = new HexadecimalModel();

  readBaseWidgetData(json, hex);

  return hex;
});

// IntLineEdit
// ----------------------------------------------------------------------------

export class IntLineEditModel extends BaseEditWidget {
  klass = 'IntLineEdit';
}

registerReader('IntLineEdit', (json) => {
  const intEdit = new IntLineEditModel();

  readBaseWidgetData(json, intEdit);

  return intEdit;
});

// DoubleLineEdit
// ----------------------------------------------------------------------------

export class DoubleLineEditModel extends BaseEditWidget {
  klass = 'DoubleLineEdit';
  decimals = -1;
}

registerReader('DoubleLineEdit', (json) => {
  const doubleEdit = new DoubleLineEditModel();

  readBaseWidgetData(json, doubleEdit);
  doubleEdit.decimals = toNum(json['@_krb:decimals'], -1);

  return doubleEdit;
});

// TickSlider
// ----------------------------------------------------------------------------

export class TickSliderModel extends BaseEditWidget {
  klass = 'TickSlider';
  ticks = 1;
  show_value = true;
}

registerReader('TickSlider', (json) => {
  const slider = new TickSliderModel();

  readBaseWidgetData(json, slider);
  slider.ticks = toNum(json['@_krb:ticks'], 1);
  slider.show_value = toBool(json['@_krb:show_value'], true);

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

registerReader('FloatSpinBox', (json) => {
  const spinbox = new FloatSpinBoxModel();

  readBaseWidgetData(json, spinbox);
  spinbox.step = toNum(json['@_krb:step']);
  spinbox.decimals = toNum(json['@_krb:decimals'], 3);

  return spinbox;
});
