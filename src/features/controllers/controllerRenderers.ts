import type { Renderer, RendererProps } from '@/features/scene-view/api';
import DisplayAlarmFloat from './components/display/DisplayAlarmFloat';
import {
  DisplayCheckBox,
  EditableCheckBox,
} from './components/display/CheckBox';
import DisplayCommand from './components/display/DisplayCommand';
import DisplayFloat from './components/display/DisplayFloat';
import DisplayLabel from './components/display/DisplayLabel';
import DisplayList from './components/display/DisplayList';
import DisplayStateColor from './components/display/DisplayStateColor';
import DisplayTrendGraph from './components/display/DisplayTrendGraph';
import DisplayVectorGraph from './components/display/DisplayVectorGraph';
import Evaluator from './components/display/Evaluator';
import {
  DisplayLineEdit,
  EditableLineEdit,
} from './components/display/LineEdit';
import StatefulIconWidget from './components/display/StatefulIconWidget';
import TableElement from './components/display/TableElement';
import EditableComboBox from './components/editable/EditableComboBox';
import {
  EditableList,
  EditableListElement,
  EditableRegexList,
} from './components/editable/EditableLists';
import EditableRegex from './components/editable/EditableRegex';
import EditableSpinBox from './components/editable/EditableSpinBox';
import DoubleLineEdit from './components/editable/DoubleLineEdit';
import FloatSpinBox from './components/editable/FloatSpinBox';
import Hexadecimal from './components/editable/Hexadecimal';
import IntLineEdit from './components/editable/IntLineEdit';
import TickSlider from './components/editable/TickSlider';

let controllerRenderersBootstrapped = false;

export function bootstrapControllerRenderers(
  registerRenderer: <TProps extends RendererProps>(
    klass: string,
    component: Renderer<TProps>
  ) => void,
  force = false
): void {
  if (controllerRenderersBootstrapped && !force) return;

  registerRenderer('DisplayLabel', DisplayLabel);
  registerRenderer('DisplayCommand', DisplayCommand);
  registerRenderer('DisplayFloat', DisplayFloat);
  registerRenderer('DisplayList', DisplayList);
  registerRenderer('DisplayAlarmFloat', DisplayAlarmFloat);
  registerRenderer('DisplayStateColor', DisplayStateColor);
  registerRenderer('Evaluator', Evaluator);
  registerRenderer('DisplayCheckBox', DisplayCheckBox);
  registerRenderer('EditableCheckBox', EditableCheckBox);
  registerRenderer('DisplayLineEdit', DisplayLineEdit);
  registerRenderer('EditableLineEdit', EditableLineEdit);
  registerRenderer('DisplayTableElement', TableElement);
  registerRenderer('EditableTableElement', TableElement);
  registerRenderer('StatefulIconWidget', StatefulIconWidget);
  registerRenderer('DisplayTrendGraph', DisplayTrendGraph);
  registerRenderer('DisplayVectorGraph', DisplayVectorGraph);
  registerRenderer('VectorGraph', DisplayVectorGraph);
  registerRenderer('IntLineEdit', IntLineEdit);
  registerRenderer('DoubleLineEdit', DoubleLineEdit);
  registerRenderer('EditableSpinBox', EditableSpinBox);
  registerRenderer('FloatSpinBox', FloatSpinBox);
  registerRenderer('TickSlider', TickSlider);
  registerRenderer('EditableComboBox', EditableComboBox);
  registerRenderer('EditableRegex', EditableRegex);
  registerRenderer('Hexadecimal', Hexadecimal);
  registerRenderer('EditableList', EditableList);
  registerRenderer('EditableRegexList', EditableRegexList);
  registerRenderer('EditableListElement', EditableListElement);

  controllerRenderersBootstrapped = true;
}
