import type { Renderer, RendererProps } from '@/features/scene-view/api';
import DisplayAlarmFloat from '@/features/controllers/display/DisplayAlarmFloat';
import DisplayBarGraph from './display/DisplayBarGraph';
import DisplayScatterGraph from './display/DisplayScatterGraph';
import {
  DisplayCheckBox,
  EditableCheckBox,
} from '@/features/controllers/display/CheckBox';
import DisplayCommand from '@/features/controllers/display/DisplayCommand';
import DisplayFloat from '@/features/controllers/display/DisplayFloat';
import DisplayLabel from '@/features/controllers/display/DisplayLabel';
import DisplayList from '@/features/controllers/display/DisplayList';
import DisplayStateColor from '@/features/controllers/display/DisplayStateColor';
import DisplayTrendGraph from '@/features/controllers/display/DisplayTrendGraph';
import DisplayVectorGraph from './display/DisplayVectorGraph';
import Evaluator from '@/features/controllers/display/Evaluator';
import {
  DisplayLineEdit,
  EditableLineEdit,
} from '@/features/controllers/display/LineEdit';
import StatefulIconWidget from '@/features/controllers/display/StatefulIconWidget';
import TableElement from '@/features/controllers/display/TableElement';
import EditableComboBox from '@/features/controllers/editable/EditableComboBox';
import {
  EditableList,
  EditableListElement,
  EditableRegexList,
} from '@/features/controllers/editable/EditableLists';
import EditableRegex from '@/features/controllers/editable/EditableRegex';
import EditableSpinBox from '@/features/controllers/editable/EditableSpinBox';
import DoubleLineEdit from '@/features/controllers/editable/DoubleLineEdit';
import FloatSpinBox from '@/features/controllers/editable/FloatSpinBox';
import Hexadecimal from '@/features/controllers/editable/Hexadecimal';
import IntLineEdit from '@/features/controllers/editable/IntLineEdit';
import TickSlider from '@/features/controllers/editable/TickSlider';

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
  registerRenderer('VectorBarGraph', DisplayBarGraph);
  registerRenderer('ScatterGraph', DisplayScatterGraph);
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
