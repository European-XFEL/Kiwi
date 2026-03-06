/**
 * Editable controller widget readers.
 */

import { registerReader } from '@/karabo/common/registry';
import {
  DoubleLineEditModel,
  EditableChoiceElementModel,
  EditableComboBoxModel,
  EditableListElementModel,
  EditableListModel,
  EditableRegexListModel,
  EditableRegexModel,
  EditableSpinBoxModel,
  FloatSpinBoxModel,
  HexadecimalModel,
  IntLineEditModel,
  TickSliderModel,
} from '@/karabo/common/models';

import {
  readBaseWidgetData,
  toBool,
  toNum,
} from '@/karabo/common/readers/util';

// EditableComboBox
// ----------------------------------------------------------------------------

registerReader('EditableComboBox', (json) => {
  const combo = new EditableComboBoxModel();

  readBaseWidgetData(json, combo);

  return combo;
});

// EditableChoiceElement
// ----------------------------------------------------------------------------

registerReader('EditableChoiceElement', (json) => {
  const choice = new EditableChoiceElementModel();

  readBaseWidgetData(json, choice);

  return choice;
});

// EditableList
// ----------------------------------------------------------------------------

registerReader('EditableList', (json) => {
  const list = new EditableListModel();

  readBaseWidgetData(json, list);

  return list;
});

// EditableRegexList
// ----------------------------------------------------------------------------

registerReader('EditableRegexList', (json) => {
  const list = new EditableRegexListModel();

  readBaseWidgetData(json, list);

  return list;
});

// EditableListElement
// ----------------------------------------------------------------------------

registerReader('EditableListElement', (json) => {
  const element = new EditableListElementModel();

  readBaseWidgetData(json, element);

  return element;
});

// EditableSpinBox
// ----------------------------------------------------------------------------

registerReader('EditableSpinBox', (json) => {
  const spinbox = new EditableSpinBoxModel();

  readBaseWidgetData(json, spinbox);

  return spinbox;
});

// EditableRegex
// ----------------------------------------------------------------------------

registerReader('EditableRegex', (json) => {
  const regex = new EditableRegexModel();

  readBaseWidgetData(json, regex);

  return regex;
});

// Hexadecimal
// ----------------------------------------------------------------------------

registerReader('Hexadecimal', (json) => {
  const hex = new HexadecimalModel();

  readBaseWidgetData(json, hex);

  return hex;
});

// IntLineEdit
// ----------------------------------------------------------------------------

registerReader('IntLineEdit', (json) => {
  const intEdit = new IntLineEditModel();

  readBaseWidgetData(json, intEdit);

  return intEdit;
});

// DoubleLineEdit
// ----------------------------------------------------------------------------

registerReader('DoubleLineEdit', (json) => {
  const doubleEdit = new DoubleLineEditModel();

  readBaseWidgetData(json, doubleEdit);
  doubleEdit.decimals = toNum(json['@_krb:decimals'], -1);

  return doubleEdit;
});

// TickSlider
// ----------------------------------------------------------------------------

registerReader('TickSlider', (json) => {
  const slider = new TickSliderModel();

  readBaseWidgetData(json, slider);
  slider.ticks = toNum(json['@_krb:ticks'], 1);
  slider.show_value = toBool(json['@_krb:show_value'], true);

  return slider;
});

// FloatSpinBox
// ----------------------------------------------------------------------------

registerReader('FloatSpinBox', (json) => {
  const spinbox = new FloatSpinBoxModel();

  readBaseWidgetData(json, spinbox);
  spinbox.step = toNum(json['@_krb:step']);
  spinbox.decimals = toNum(json['@_krb:decimals'], 3);

  return spinbox;
});
