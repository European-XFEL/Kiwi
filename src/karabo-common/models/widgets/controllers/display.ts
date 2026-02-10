/**
 * Display controller widget models.
 *
 * Hierarchy matches Python Karabo (karabo.common.scenemodel).
 * Dual-mode widgets (CheckBox, LineEdit, TableElement) extend
 * BaseDisplayEditableWidget — resolved at build time.
 */

import {
  FONT_BASE_SIZE,
  FONT_FAMILY_DEFAULT,
} from '@/features/controllers/utils/fontDefaults';
import {
  BaseLabelModel,
  BaseWidgetObjectData,
  BaseDisplayEditableWidget,
  BasePlotModel,
} from '../../bases';

// DisplayLabel
// ----------------------------------------------------------------------------

export class DisplayLabelModel extends BaseLabelModel {
  klass = 'DisplayLabel';
}

// DisplayList
// ----------------------------------------------------------------------------

export class DisplayListModel extends BaseLabelModel {
  klass = 'DisplayList';
}

// DisplayFloat
// ----------------------------------------------------------------------------

export class DisplayFloatModel extends BaseLabelModel {
  klass = 'DisplayFloat';
  fmt = 'g';
  decimals = '8';
}

// DisplayAlarmFloat — extends DisplayFloatModel (Python: simple.py:89)
// ----------------------------------------------------------------------------

export class DisplayAlarmFloatModel extends DisplayFloatModel {
  klass = 'DisplayAlarmFloat';
  alarmHigh?: number;
  alarmLow?: number;
  warnHigh?: number;
  warnLow?: number;
}

// CheckBox — dual-mode (Display/Editable)
// ----------------------------------------------------------------------------

export class CheckBoxModel extends BaseDisplayEditableWidget {
  klass: 'DisplayCheckBox' | 'EditableCheckBox' = 'DisplayCheckBox';
}

// LineEdit — dual-mode (Display/Editable)
// ----------------------------------------------------------------------------

export class LineEditModel extends BaseDisplayEditableWidget {
  klass: 'DisplayLineEdit' | 'EditableLineEdit' = 'DisplayLineEdit';
}

// TableElement — dual-mode (Display/Editable)
// ----------------------------------------------------------------------------

export class TableElementModel extends BaseDisplayEditableWidget {
  klass: 'DisplayTableElement' | 'EditableTableElement' = 'DisplayTableElement';
  resizeToContents = false;
}

// DisplayCommand
// ----------------------------------------------------------------------------
//structure and label(button)
export class DisplayCommandModel extends BaseWidgetObjectData {
  klass = 'DisplayCommand';
  requires_confirmation = false;
  font_family: string = FONT_FAMILY_DEFAULT;
  font_size: number = FONT_BASE_SIZE;
  font_weight: 'normal' | 'bold' = 'normal';
  font_style: string = 'normal';
}

// DisplayStateColor — extends DisplayLabelModel (Python: complex.py:72)
// ----------------------------------------------------------------------------

export class DisplayStateColorModel extends DisplayLabelModel {
  klass = 'DisplayStateColor';
  show_string = false;
}

// StatefulIconWidget
// ----------------------------------------------------------------------------

export class StatefulIconWidgetModel extends BaseWidgetObjectData {
  klass = 'StatefulIconWidget';
  icon_name = '';
}

// Evaluator — extends DisplayLabelModel (Python: complex.py:85)
// ----------------------------------------------------------------------------

export class EvaluatorModel extends DisplayLabelModel {
  klass = 'Evaluator';
  expression = 'x';
}

// DisplayTrendGraph
// ----------------------------------------------------------------------------

export class DisplayTrendGraphModel extends BasePlotModel {
  klass = 'DisplayTrendGraph';
}

// DisplayVectorGraph
// ----------------------------------------------------------------------------

export class DisplayVectorGraphModel extends BasePlotModel {
  klass = 'DisplayVectorGraph';
  offset = 0.0;
  step = 1.0;
  roi_tool = 0;
}
