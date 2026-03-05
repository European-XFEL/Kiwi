/**
 * Editable controller widget models.
 *
 * All extend BaseEditWidget (→ BaseWidgetObjectData).
 * All default to parent_component = 'EditableApplyLaterComponent'.
 */

import { BaseEditWidget } from '../bases';
import { FONT_SIZE_DEFAULT } from '../../constants';

// EditableComboBox
// ----------------------------------------------------------------------------

export class EditableComboBoxModel extends BaseEditWidget {
  klass = 'EditableComboBox';
}

// EditableList
// ----------------------------------------------------------------------------

export class EditableListModel extends BaseEditWidget {
  klass = 'EditableList';
}

// EditableRegexList
// ----------------------------------------------------------------------------

export class EditableRegexListModel extends BaseEditWidget {
  klass = 'EditableRegexList';
}

// EditableListElement
// ----------------------------------------------------------------------------

export class EditableListElementModel extends BaseEditWidget {
  klass = 'EditableListElement';
}

// EditableSpinBox
// ----------------------------------------------------------------------------

export class EditableSpinBoxModel extends BaseEditWidget {
  klass = 'EditableSpinBox';
  font_size = FONT_SIZE_DEFAULT;
  font_weight: 'normal' | 'bold' = 'normal';
}

// EditableRegex (Python: EditableRegexModel)
// ----------------------------------------------------------------------------

export class EditableRegexModel extends BaseEditWidget {
  klass = 'EditableRegex';
}

// Hexadecimal
// ----------------------------------------------------------------------------

export class HexadecimalModel extends BaseEditWidget {
  klass = 'Hexadecimal';
}

// IntLineEdit
// ----------------------------------------------------------------------------

export class IntLineEditModel extends BaseEditWidget {
  klass = 'IntLineEdit';
}

// DoubleLineEdit
// ----------------------------------------------------------------------------

export class DoubleLineEditModel extends BaseEditWidget {
  klass = 'DoubleLineEdit';
  decimals = -1;
}

// TickSlider
// ----------------------------------------------------------------------------

export class TickSliderModel extends BaseEditWidget {
  klass = 'TickSlider';
  ticks = 1;
  show_value = true;
}

// FloatSpinBox
// ----------------------------------------------------------------------------

export class FloatSpinBoxModel extends BaseEditWidget {
  klass = 'FloatSpinBox';
  step = 0;
  decimals = 3;
  font_size = FONT_SIZE_DEFAULT;
  font_weight: 'normal' | 'bold' = 'normal';
}
