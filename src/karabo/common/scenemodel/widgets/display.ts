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
import { readBaseWidgetData, toBool, toNum, toStr } from '../util';
import { registerReader } from '../Registry';

// DisplayLabel
// ----------------------------------------------------------------------------

export class DisplayLabelModel extends BaseLabelModel {
  klass = 'DisplayLabel';
}

registerReader('DisplayLabel', (json) => {
  const label = new DisplayLabelModel();

  readBaseWidgetData(json, label);
  if (json['@_krb:font_size'] !== undefined)
    label.font_size = toNum(json['@_krb:font_size'], label.font_size);
  if (toStr(json['@_krb:font_weight']) === 'bold') label.font_weight = 'bold';

  return label;
});

// DisplayList
// ----------------------------------------------------------------------------

export class DisplayListModel extends BaseLabelModel {
  klass = 'DisplayList';
}

registerReader('DisplayList', (json) => {
  const list = new DisplayListModel();

  readBaseWidgetData(json, list);
  if (json['@_krb:font_size'] !== undefined)
    list.font_size = toNum(json['@_krb:font_size'], list.font_size);
  if (toStr(json['@_krb:font_weight']) === 'bold') list.font_weight = 'bold';

  return list;
});

// DisplayFloat
// ----------------------------------------------------------------------------

export class DisplayFloatModel extends BaseLabelModel {
  klass = 'DisplayFloat';
  fmt = 'g';
  decimals = '8';
}

registerReader('DisplayFloat', (json) => {
  const float = new DisplayFloatModel();

  readBaseWidgetData(json, float);
  if (json['@_krb:font_size'] !== undefined)
    float.font_size = toNum(json['@_krb:font_size'], float.font_size);
  if (toStr(json['@_krb:font_weight']) === 'bold') float.font_weight = 'bold';
  float.fmt = toStr(json['@_krb:fmt'], 'g');
  float.decimals = toStr(json['@_krb:decimals'], '8');

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

registerReader('DisplayAlarmFloat', (json) => {
  const alarm = new DisplayAlarmFloatModel();

  readBaseWidgetData(json, alarm);
  alarm.fmt = toStr(json['@_krb:fmt'], 'g');
  alarm.decimals = toStr(json['@_krb:decimals'], '8');

  const alarmHigh = json['@_krb:alarmHigh'];
  const alarmLow = json['@_krb:alarmLow'];
  const warnHigh = json['@_krb:warnHigh'];
  const warnLow = json['@_krb:warnLow'];
  if (alarmHigh !== undefined) alarm.alarmHigh = toNum(alarmHigh);
  if (alarmLow !== undefined) alarm.alarmLow = toNum(alarmLow);
  if (warnHigh !== undefined) alarm.warnHigh = toNum(warnHigh);
  if (warnLow !== undefined) alarm.warnLow = toNum(warnLow);

  return alarm;
});

// CheckBox — dual-mode (Display/Editable)
// ----------------------------------------------------------------------------

export class CheckBoxModel extends BaseDisplayEditableWidget {
  klass: 'DisplayCheckBox' | 'EditableCheckBox' = 'DisplayCheckBox';
}

registerReader('DisplayCheckBox', (json) => {
  const checkbox = new CheckBoxModel();

  checkbox.klass = 'DisplayCheckBox';
  readBaseWidgetData(json, checkbox);

  return checkbox;
});

registerReader('EditableCheckBox', (json) => {
  const checkbox = new CheckBoxModel();

  checkbox.klass = 'EditableCheckBox';
  readBaseWidgetData(json, checkbox);

  return checkbox;
});

// LineEdit — dual-mode (Display/Editable)
// ----------------------------------------------------------------------------

export class LineEditModel extends BaseDisplayEditableWidget {
  klass: 'DisplayLineEdit' | 'EditableLineEdit' = 'DisplayLineEdit';
}

registerReader('DisplayLineEdit', (json) => {
  const lineEdit = new LineEditModel();

  lineEdit.klass = 'DisplayLineEdit';
  readBaseWidgetData(json, lineEdit);

  return lineEdit;
});

registerReader('EditableLineEdit', (json) => {
  const lineEdit = new LineEditModel();

  lineEdit.klass = 'EditableLineEdit';
  readBaseWidgetData(json, lineEdit);

  return lineEdit;
});

// TableElement — dual-mode (Display/Editable)
// ----------------------------------------------------------------------------

export class TableElementModel extends BaseDisplayEditableWidget {
  klass: 'DisplayTableElement' | 'EditableTableElement' = 'DisplayTableElement';
  resizeToContents = false;
}

registerReader('DisplayTableElement', (json) => {
  const table = new TableElementModel();

  table.klass = 'DisplayTableElement';
  readBaseWidgetData(json, table);
  table.resizeToContents = toBool(json['@_krb:resizeToContents']);

  return table;
});

registerReader('EditableTableElement', (json) => {
  const table = new TableElementModel();

  table.klass = 'EditableTableElement';
  readBaseWidgetData(json, table);
  table.resizeToContents = toBool(json['@_krb:resizeToContents']);

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

registerReader('DisplayCommand', (json) => {
  const command = new DisplayCommandModel();

  readBaseWidgetData(json, command);
  if (json['@_krb:font_size'] !== undefined)
    command.font_size = toNum(json['@_krb:font_size'], command.font_size);
  if (toStr(json['@_krb:font_weight']) === 'bold') command.font_weight = 'bold';
  command.requires_confirmation = toBool(json['@_krb:requires_confirmation']);

  return command;
});

// DisplayStateColor — extends DisplayLabelModel (Python: complex.py:72)
// ----------------------------------------------------------------------------

export class DisplayStateColorModel extends DisplayLabelModel {
  klass = 'DisplayStateColor';
  show_string = false;
}

registerReader('DisplayStateColor', (json) => {
  const state = new DisplayStateColorModel();

  readBaseWidgetData(json, state);
  state.show_string = toBool(json['@_krb:show_string']);

  return state;
});

// StatefulIconWidget
// ----------------------------------------------------------------------------

export class StatefulIconWidgetModel extends BaseWidgetObjectData {
  klass = 'StatefulIconWidget';
  icon_name = '';
}

registerReader('StatefulIconWidget', (json) => {
  const icon = new StatefulIconWidgetModel();

  readBaseWidgetData(json, icon);
  icon.icon_name = toStr(json['@_krb:icon_name']);

  return icon;
});

// Evaluator — extends DisplayLabelModel (Python: complex.py:85)
// ----------------------------------------------------------------------------

export class EvaluatorModel extends DisplayLabelModel {
  klass = 'Evaluator';
  expression = 'x';
}

registerReader('Evaluator', (json) => {
  const evaluator = new EvaluatorModel();

  readBaseWidgetData(json, evaluator);
  evaluator.expression = toStr(json['@_krb:expression'], 'x');

  return evaluator;
});

// DisplayTrendGraph
// ----------------------------------------------------------------------------

export class DisplayTrendGraphModel extends BasePlotModel {
  klass = 'DisplayTrendGraph';
}

const readTrendGraph = (json: Record<string, unknown>) => {
  const graph = new DisplayTrendGraphModel();

  readBaseWidgetData(json, graph);
  graph.x_label = toStr(json['@_krb:x_label']);
  graph.y_label = toStr(json['@_krb:y_label']);
  graph.x_units = toStr(json['@_krb:x_units']);
  graph.y_units = toStr(json['@_krb:y_units']);
  graph.x_grid = toBool(json['@_krb:x_grid']);
  graph.y_grid = toBool(json['@_krb:y_grid']);
  graph.x_log = toBool(json['@_krb:x_log']);
  graph.y_log = toBool(json['@_krb:y_log']);
  graph.x_invert = toBool(json['@_krb:x_invert']);
  graph.y_invert = toBool(json['@_krb:y_invert']);
  graph.x_autorange = toBool(json['@_krb:x_autorange'], true);
  graph.y_autorange = toBool(json['@_krb:y_autorange'], true);
  graph.x_min = toNum(json['@_krb:x_min']);
  graph.x_max = toNum(json['@_krb:x_max']);
  graph.y_min = toNum(json['@_krb:y_min']);
  graph.y_max = toNum(json['@_krb:y_max']);
  graph.title = toStr(json['@_krb:title']);
  graph.background = toStr(json['@_krb:background'], 'transparent');

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

const readVectorGraph = (json: Record<string, unknown>) => {
  const graph = new DisplayVectorGraphModel();

  readBaseWidgetData(json, graph);
  graph.x_label = toStr(json['@_krb:x_label']);
  graph.y_label = toStr(json['@_krb:y_label']);
  graph.x_units = toStr(json['@_krb:x_units']);
  graph.y_units = toStr(json['@_krb:y_units']);
  graph.x_grid = toBool(json['@_krb:x_grid']);
  graph.y_grid = toBool(json['@_krb:y_grid']);
  graph.x_log = toBool(json['@_krb:x_log']);
  graph.y_log = toBool(json['@_krb:y_log']);
  graph.x_invert = toBool(json['@_krb:x_invert']);
  graph.y_invert = toBool(json['@_krb:y_invert']);
  graph.x_autorange = toBool(json['@_krb:x_autorange'], true);
  graph.y_autorange = toBool(json['@_krb:y_autorange'], true);
  graph.x_min = toNum(json['@_krb:x_min']);
  graph.x_max = toNum(json['@_krb:x_max']);
  graph.y_min = toNum(json['@_krb:y_min']);
  graph.y_max = toNum(json['@_krb:y_max']);
  graph.title = toStr(json['@_krb:title']);
  graph.background = toStr(json['@_krb:background'], 'transparent');
  graph.offset = toNum(json['@_krb:offset']);
  graph.step = toNum(json['@_krb:step'], 1.0);
  graph.roi_tool = toNum(json['@_krb:roi_tool']);

  return graph;
};

registerReader('VectorGraph', readVectorGraph);
