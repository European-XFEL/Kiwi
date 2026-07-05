/**
 * Display controller widget models.
 *
 * Hierarchy matches Python Karabo (karabo.common.scenemodel).
 * Dual-mode widgets (CheckBox, LineEdit, TableElement) extend
 * BaseDisplayEditableWidget — resolved at build time.
 */

import {
  BaseLabelModel,
  BaseWidgetObjectData,
  BaseDisplayEditableWidget,
  BasePlotModel,
} from '../bases';
import { FONT_SIZE_DEFAULT } from '../constants';
import { krbAttr, readBaseWidgetData, toBool, toNum, toStr } from '../util';
import { registerReader } from '../Registry';

// DisplayLabel
// ----------------------------------------------------------------------------

export class DisplayLabelModel extends BaseLabelModel {
  klass = 'DisplayLabel';
}

registerReader('DisplayLabel', (element) => {
  const label = new DisplayLabelModel();

  readBaseWidgetData(element, label);
  if (krbAttr(element, 'font_size') !== null)
    label.font_size = toNum(krbAttr(element, 'font_size'), label.font_size);
  if (toStr(krbAttr(element, 'font_weight')) === 'bold')
    label.font_weight = 'bold';

  return label;
});

// DisplayList
// ----------------------------------------------------------------------------

export class DisplayListModel extends BaseLabelModel {
  klass = 'DisplayList';
}

registerReader('DisplayList', (element) => {
  const list = new DisplayListModel();

  readBaseWidgetData(element, list);
  if (krbAttr(element, 'font_size') !== null)
    list.font_size = toNum(krbAttr(element, 'font_size'), list.font_size);
  if (toStr(krbAttr(element, 'font_weight')) === 'bold')
    list.font_weight = 'bold';

  return list;
});

// DisplayFloat
// ----------------------------------------------------------------------------

export class DisplayFloatModel extends BaseLabelModel {
  klass = 'DisplayFloat';
  fmt = 'g';
  decimals = '8';
}

registerReader('DisplayFloat', (element) => {
  const float = new DisplayFloatModel();

  readBaseWidgetData(element, float);
  if (krbAttr(element, 'font_size') !== null)
    float.font_size = toNum(krbAttr(element, 'font_size'), float.font_size);
  if (toStr(krbAttr(element, 'font_weight')) === 'bold')
    float.font_weight = 'bold';
  float.fmt = toStr(krbAttr(element, 'fmt'), 'g');
  float.decimals = toStr(krbAttr(element, 'decimals'), '8');

  return float;
});

// DisplayAlarmFloat — extends DisplayFloatModel (Python: simple.py:89)
// ----------------------------------------------------------------------------

export class DisplayAlarmFloatModel extends DisplayFloatModel {
  klass = 'DisplayAlarmFloat';
  alarmHigh?: number;
  alarmLow?: number;
  warnHigh?: number;
  warnLow?: number;
}

registerReader('DisplayAlarmFloat', (element) => {
  const alarm = new DisplayAlarmFloatModel();

  readBaseWidgetData(element, alarm);
  alarm.fmt = toStr(krbAttr(element, 'fmt'), 'g');
  alarm.decimals = toStr(krbAttr(element, 'decimals'), '8');

  const alarmHigh = krbAttr(element, 'alarmHigh');
  const alarmLow = krbAttr(element, 'alarmLow');
  const warnHigh = krbAttr(element, 'warnHigh');
  const warnLow = krbAttr(element, 'warnLow');
  if (alarmHigh !== null) alarm.alarmHigh = toNum(alarmHigh);
  if (alarmLow !== null) alarm.alarmLow = toNum(alarmLow);
  if (warnHigh !== null) alarm.warnHigh = toNum(warnHigh);
  if (warnLow !== null) alarm.warnLow = toNum(warnLow);

  return alarm;
});

// CheckBox — dual-mode (Display/Editable)
// ----------------------------------------------------------------------------

export class CheckBoxModel extends BaseDisplayEditableWidget {
  klass: 'DisplayCheckBox' | 'EditableCheckBox' = 'DisplayCheckBox';
}

registerReader('DisplayCheckBox', (element) => {
  const checkbox = new CheckBoxModel();

  checkbox.klass = 'DisplayCheckBox';
  readBaseWidgetData(element, checkbox);

  return checkbox;
});

registerReader('EditableCheckBox', (element) => {
  const checkbox = new CheckBoxModel();

  checkbox.klass = 'EditableCheckBox';
  readBaseWidgetData(element, checkbox);

  return checkbox;
});

// LineEdit — dual-mode (Display/Editable)
// ----------------------------------------------------------------------------

export class LineEditModel extends BaseDisplayEditableWidget {
  klass: 'DisplayLineEdit' | 'EditableLineEdit' = 'DisplayLineEdit';
}

registerReader('DisplayLineEdit', (element) => {
  const lineEdit = new LineEditModel();

  lineEdit.klass = 'DisplayLineEdit';
  readBaseWidgetData(element, lineEdit);

  return lineEdit;
});

registerReader('EditableLineEdit', (element) => {
  const lineEdit = new LineEditModel();

  lineEdit.klass = 'EditableLineEdit';
  readBaseWidgetData(element, lineEdit);

  return lineEdit;
});

// TableElement — dual-mode (Display/Editable)
// ----------------------------------------------------------------------------

export class TableElementModel extends BaseDisplayEditableWidget {
  klass: 'DisplayTableElement' | 'EditableTableElement' = 'DisplayTableElement';
  resizeToContents = false;
}

registerReader('DisplayTableElement', (element) => {
  const table = new TableElementModel();

  table.klass = 'DisplayTableElement';
  readBaseWidgetData(element, table);
  table.resizeToContents = toBool(krbAttr(element, 'resizeToContents'));

  return table;
});

registerReader('EditableTableElement', (element) => {
  const table = new TableElementModel();

  table.klass = 'EditableTableElement';
  readBaseWidgetData(element, table);
  table.resizeToContents = toBool(krbAttr(element, 'resizeToContents'));

  return table;
});

// DisplayCommand
// ----------------------------------------------------------------------------

export class DisplayCommandModel extends BaseWidgetObjectData {
  klass = 'DisplayCommand';
  requires_confirmation = false;
  font_size = FONT_SIZE_DEFAULT;
  font_weight: 'normal' | 'bold' = 'normal';
}

registerReader('DisplayCommand', (element) => {
  const command = new DisplayCommandModel();

  readBaseWidgetData(element, command);
  if (krbAttr(element, 'font_size') !== null)
    command.font_size = toNum(krbAttr(element, 'font_size'), command.font_size);
  if (toStr(krbAttr(element, 'font_weight')) === 'bold')
    command.font_weight = 'bold';
  command.requires_confirmation = toBool(
    krbAttr(element, 'requires_confirmation')
  );

  return command;
});

// DisplayStateColor — extends DisplayLabelModel (Python: complex.py:72)
// ----------------------------------------------------------------------------

export class DisplayStateColorModel extends DisplayLabelModel {
  klass = 'DisplayStateColor';
  show_string = false;
}

registerReader('DisplayStateColor', (element) => {
  const state = new DisplayStateColorModel();

  readBaseWidgetData(element, state);
  if (krbAttr(element, 'font_size') !== null)
    state.font_size = toNum(krbAttr(element, 'font_size'), state.font_size);
  if (toStr(krbAttr(element, 'font_weight')) === 'bold')
    state.font_weight = 'bold';
  state.show_string = toBool(krbAttr(element, 'show_string'));

  return state;
});

// StatefulIconWidget
// ----------------------------------------------------------------------------

export class StatefulIconWidgetModel extends BaseWidgetObjectData {
  klass = 'StatefulIconWidget';
  icon_name = '';
}

registerReader('StatefulIconWidget', (element) => {
  const icon = new StatefulIconWidgetModel();

  readBaseWidgetData(element, icon);
  icon.icon_name = toStr(krbAttr(element, 'icon_name'));

  return icon;
});

// Evaluator — extends DisplayLabelModel (Python: complex.py:85)
// ----------------------------------------------------------------------------

export class EvaluatorModel extends DisplayLabelModel {
  klass = 'Evaluator';
  expression = 'x';
}

registerReader('Evaluator', (element) => {
  const evaluator = new EvaluatorModel();

  readBaseWidgetData(element, evaluator);
  evaluator.expression = toStr(krbAttr(element, 'expression'), 'x');

  return evaluator;
});

// DisplayTrendGraph
// ----------------------------------------------------------------------------

export class DisplayTrendGraphModel extends BasePlotModel {
  klass = 'DisplayTrendGraph';
}

const readTrendGraph = (element: Element) => {
  const graph = new DisplayTrendGraphModel();

  readBaseWidgetData(element, graph);
  graph.x_label = toStr(krbAttr(element, 'x_label'));
  graph.y_label = toStr(krbAttr(element, 'y_label'));
  graph.x_units = toStr(krbAttr(element, 'x_units'));
  graph.y_units = toStr(krbAttr(element, 'y_units'));
  graph.x_grid = toBool(krbAttr(element, 'x_grid'));
  graph.y_grid = toBool(krbAttr(element, 'y_grid'));
  graph.x_log = toBool(krbAttr(element, 'x_log'));
  graph.y_log = toBool(krbAttr(element, 'y_log'));
  graph.x_invert = toBool(krbAttr(element, 'x_invert'));
  graph.y_invert = toBool(krbAttr(element, 'y_invert'));
  graph.x_autorange = toBool(krbAttr(element, 'x_autorange'), true);
  graph.y_autorange = toBool(krbAttr(element, 'y_autorange'), true);
  graph.x_min = toNum(krbAttr(element, 'x_min'));
  graph.x_max = toNum(krbAttr(element, 'x_max'));
  graph.y_min = toNum(krbAttr(element, 'y_min'));
  graph.y_max = toNum(krbAttr(element, 'y_max'));
  graph.title = toStr(krbAttr(element, 'title'));
  graph.background = toStr(krbAttr(element, 'background'), 'transparent');

  return graph;
};

registerReader('DisplayTrendGraph', readTrendGraph);

// DisplayVectorGraph
// ----------------------------------------------------------------------------

export class DisplayVectorGraphModel extends BasePlotModel {
  klass = 'DisplayVectorGraph';
  offset = 0.0;
  step = 1.0;
  roi_tool = 0;
}

const readVectorGraph = (element: Element) => {
  const graph = new DisplayVectorGraphModel();

  readBaseWidgetData(element, graph);
  graph.x_label = toStr(krbAttr(element, 'x_label'));
  graph.y_label = toStr(krbAttr(element, 'y_label'));
  graph.x_units = toStr(krbAttr(element, 'x_units'));
  graph.y_units = toStr(krbAttr(element, 'y_units'));
  graph.x_grid = toBool(krbAttr(element, 'x_grid'));
  graph.y_grid = toBool(krbAttr(element, 'y_grid'));
  graph.x_log = toBool(krbAttr(element, 'x_log'));
  graph.y_log = toBool(krbAttr(element, 'y_log'));
  graph.x_invert = toBool(krbAttr(element, 'x_invert'));
  graph.y_invert = toBool(krbAttr(element, 'y_invert'));
  graph.x_autorange = toBool(krbAttr(element, 'x_autorange'), true);
  graph.y_autorange = toBool(krbAttr(element, 'y_autorange'), true);
  graph.x_min = toNum(krbAttr(element, 'x_min'));
  graph.x_max = toNum(krbAttr(element, 'x_max'));
  graph.y_min = toNum(krbAttr(element, 'y_min'));
  graph.y_max = toNum(krbAttr(element, 'y_max'));
  graph.title = toStr(krbAttr(element, 'title'));
  graph.background = toStr(krbAttr(element, 'background'), 'transparent');
  graph.offset = toNum(krbAttr(element, 'offset'));
  graph.step = toNum(krbAttr(element, 'step'), 1.0);
  graph.roi_tool = toNum(krbAttr(element, 'roi_tool'));

  return graph;
};

registerReader('VectorGraph', readVectorGraph);
