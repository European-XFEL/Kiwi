import DisplayBarGraph from '../display/DisplayBarGraph';
import DisplayAlarm from '../display/DisplayAlarm';
import DisplayColorBool from '../display/DisplayColorBool';
import DisplayErrorBool from '../display/DisplayErrorBool';
import DisplayScatterGraph from '../display/DisplayScatterGraph';
import DisplayVectorGraph from '../display/DisplayVectorGraph';
import DisplayVectorXYGraph from '../display/DisplayVectorXYGraph';
import DisplayVectorScatterGraph from '../display/DisplayVectorScatterGraph';
import DisplayTrendGraph from '../display/DisplayTrendGraph';
import DisplayWebcamGraph from '../display/DisplayWebcamGraph';
import DisplayImageGraph from '../display/DisplayImageGraph';
import { FilterTableElement } from '../display/TableElement';
import DisplayTextLog from '../display/DisplayTextLog';
import Lamp from '../display/Lamp';
import SingleBit from '../display/SingleBit';
import { bootstrapControllerRenderers } from '../controllerRenderers';

jest.mock('../display/StatefulIconWidget', () => () => null);

test('registers the SingleBit controller', () => {
  const renderers = new Map<string, unknown>();
  bootstrapControllerRenderers((klass, renderer) => {
    renderers.set(klass, renderer);
  }, true);
  expect(renderers.get('SingleBit')).toBe(SingleBit);
});

test('editable filter tables use the display filter renderer', () => {
  const renderers = new Map<string, unknown>();
  bootstrapControllerRenderers((klass, renderer) => {
    renderers.set(klass, renderer);
  }, true);
  expect(renderers.get('DisplayFilterTableElement')).toBe(FilterTableElement);
  expect(renderers.get('EditableFilterTableElement')).toBe(FilterTableElement);
});

test('registers separate vector line and bar controllers', () => {
  const renderers = new Map<string, unknown>();
  bootstrapControllerRenderers((klass, renderer) => {
    renderers.set(klass, renderer);
  }, true);

  expect(renderers.get('DisplayVectorGraph')).toBe(DisplayVectorGraph);
  expect(renderers.get('DisplayColorBool')).toBe(DisplayColorBool);
  expect(renderers.get('DisplayErrorBool')).toBe(DisplayErrorBool);
  expect(renderers.get('GlobalAlarm')).toBe(DisplayAlarm);
  expect(renderers.get('DisplayTextLog')).toBe(DisplayTextLog);
  expect(renderers.get('Lamp')).toBe(Lamp);
  expect(renderers.get('VectorGraph')).toBe(DisplayVectorGraph);
  expect(renderers.get('NDArrayGraph')).toBe(DisplayVectorGraph);
  expect(renderers.get('VectorXYGraph')).toBe(DisplayVectorXYGraph);
  expect(renderers.get('VectorScatterGraph')).toBe(DisplayVectorScatterGraph);
  expect(renderers.get('VectorBarGraph')).toBe(DisplayBarGraph);
  expect(renderers.get('ScatterGraph')).toBe(DisplayScatterGraph);
  expect(renderers.get('DisplayStateGraph')).toBe(DisplayTrendGraph);
  expect(renderers.get('DisplayAlarmGraph')).toBe(DisplayTrendGraph);
  expect(renderers.get('DetectorGraph')).toBe(DisplayWebcamGraph);
  expect(renderers.get('WebCamGraph')).toBe(DisplayWebcamGraph);
  expect(renderers.get('ImageGraph')).toBe(DisplayImageGraph);
  expect(DisplayBarGraph).not.toBe(DisplayVectorGraph);
});
test('registers an icon command renderer distinct from the text command', () => {
  const renderers = new Map<string, unknown>();
  bootstrapControllerRenderers((klass, renderer) => {
    renderers.set(klass, renderer);
  }, true);
  expect(renderers.get('DisplayIconCommand')).toEqual(expect.any(Function));
  expect(renderers.get('DisplayIconCommand')).not.toBe(
    renderers.get('DisplayCommand')
  );
});
