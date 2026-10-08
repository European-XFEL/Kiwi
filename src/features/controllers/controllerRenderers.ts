import type { Renderer, RendererProps } from '@/features/scene-view/api';
import DisplayAlarmFloat from '@/features/controllers/display/DisplayAlarmFloat';
import DisplayBarGraph from './display/DisplayBarGraph';
import DisplayAlarm from './display/DisplayAlarm';
import DisplayWebcamGraph from './display/DisplayWebcamGraph';
import DisplayScatterGraph from './display/DisplayScatterGraph';
import {
  DisplayCheckBox,
  EditableCheckBox,
} from '@/features/controllers/display/CheckBox';
import DisplayCommand from '@/features/controllers/display/DisplayCommand';
import DisplayColorBool from '@/features/controllers/display/DisplayColorBool';
import DisplayErrorBool from './display/DisplayErrorBool';
import DisplayFloat from '@/features/controllers/display/DisplayFloat';
import DisplayLabel from '@/features/controllers/display/DisplayLabel';
import DisplayList from '@/features/controllers/display/DisplayList';
import DisplayStateColor from '@/features/controllers/display/DisplayStateColor';
import DisplayTextLog from '@/features/controllers/display/DisplayTextLog';
import DisplayTrendGraph from '@/features/controllers/display/DisplayTrendGraph';
import DisplayVectorGraph from './display/DisplayVectorGraph';
import DisplayVectorXYGraph from './display/DisplayVectorXYGraph';
import DisplayVectorScatterGraph from './display/DisplayVectorScatterGraph';
import Evaluator from '@/features/controllers/display/Evaluator';
import {
  DisplayLineEdit,
  EditableLineEdit,
} from '@/features/controllers/display/LineEdit';
import StatefulIconWidget from '@/features/controllers/display/StatefulIconWidget';
import TableElement, {
  FilterTableElement,
} from '@/features/controllers/display/TableElement';
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
  registerRenderer('DisplayColorBool', DisplayColorBool);
  registerRenderer('DisplayErrorBool', DisplayErrorBool);
  registerRenderer('DisplayList', DisplayList);
  registerRenderer('DisplayTextLog', DisplayTextLog);
  registerRenderer('DisplayAlarmFloat', DisplayAlarmFloat);
  registerRenderer('GlobalAlarm', DisplayAlarm);
  registerRenderer('DisplayStateColor', DisplayStateColor);
  registerRenderer('Evaluator', Evaluator);
  registerRenderer('DisplayCheckBox', DisplayCheckBox);
  registerRenderer('EditableCheckBox', EditableCheckBox);
  registerRenderer('DisplayLineEdit', DisplayLineEdit);
  registerRenderer('EditableLineEdit', EditableLineEdit);
  registerRenderer('DisplayTableElement', TableElement);
  registerRenderer('EditableTableElement', TableElement);
  registerRenderer('DisplayFilterTableElement', FilterTableElement);
  registerRenderer('EditableFilterTableElement', FilterTableElement);
  registerRenderer('StatefulIconWidget', StatefulIconWidget);
  registerRenderer('DisplayTrendGraph', DisplayTrendGraph);
  registerRenderer('DisplayStateGraph', DisplayTrendGraph);
  registerRenderer('DisplayAlarmGraph', DisplayTrendGraph);
  registerRenderer('DisplayVectorGraph', DisplayVectorGraph);
  registerRenderer('VectorGraph', DisplayVectorGraph);
  registerRenderer('NDArrayGraph', DisplayVectorGraph);
  registerRenderer('VectorXYGraph', DisplayVectorXYGraph);
  registerRenderer('VectorScatterGraph', DisplayVectorScatterGraph);
  registerRenderer('VectorBarGraph', DisplayBarGraph);
  registerRenderer('ScatterGraph', DisplayScatterGraph);
  registerRenderer('WebCamGraph', DisplayWebcamGraph);
  registerRenderer('ImageGraph', DisplayWebcamGraph);
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
