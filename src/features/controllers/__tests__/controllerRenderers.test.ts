import DisplayBarGraph from '../display/DisplayBarGraph';
import DisplayColorBool from '../display/DisplayColorBool';
import DisplayScatterGraph from '../display/DisplayScatterGraph';
import DisplayVectorGraph from '../display/DisplayVectorGraph';
import DisplayVectorXYGraph from '../display/DisplayVectorXYGraph';
import DisplayVectorScatterGraph from '../display/DisplayVectorScatterGraph';
import DisplayTrendGraph from '../display/DisplayTrendGraph';
import { FilterTableElement } from '../display/TableElement';
import { bootstrapControllerRenderers } from '../controllerRenderers';

jest.mock('../display/StatefulIconWidget', () => () => null);

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
  expect(renderers.get('VectorGraph')).toBe(DisplayVectorGraph);
  expect(renderers.get('NDArrayGraph')).toBe(DisplayVectorGraph);
  expect(renderers.get('VectorXYGraph')).toBe(DisplayVectorXYGraph);
  expect(renderers.get('VectorScatterGraph')).toBe(DisplayVectorScatterGraph);
  expect(renderers.get('VectorBarGraph')).toBe(DisplayBarGraph);
  expect(renderers.get('ScatterGraph')).toBe(DisplayScatterGraph);
  expect(renderers.get('DisplayStateGraph')).toBe(DisplayTrendGraph);
  expect(renderers.get('DisplayAlarmGraph')).toBe(DisplayTrendGraph);
  expect(DisplayBarGraph).not.toBe(DisplayVectorGraph);
});
