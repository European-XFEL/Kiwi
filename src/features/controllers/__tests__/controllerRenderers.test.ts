import DisplayBarGraph from '../display/DisplayBarGraph';
import DisplayScatterGraph from '../display/DisplayScatterGraph';
import DisplayVectorGraph from '../display/DisplayVectorGraph';
import DisplayTrendGraph from '../display/DisplayTrendGraph';
import { bootstrapControllerRenderers } from '../controllerRenderers';

jest.mock('../display/StatefulIconWidget', () => () => null);

test('registers separate vector line and bar controllers', () => {
  const renderers = new Map<string, unknown>();
  bootstrapControllerRenderers((klass, renderer) => {
    renderers.set(klass, renderer);
  }, true);

  expect(renderers.get('DisplayVectorGraph')).toBe(DisplayVectorGraph);
  expect(renderers.get('VectorGraph')).toBe(DisplayVectorGraph);
  expect(renderers.get('VectorBarGraph')).toBe(DisplayBarGraph);
  expect(renderers.get('ScatterGraph')).toBe(DisplayScatterGraph);
  expect(renderers.get('DisplayStateGraph')).toBe(DisplayTrendGraph);
  expect(renderers.get('DisplayAlarmGraph')).toBe(DisplayTrendGraph);
  expect(DisplayBarGraph).not.toBe(DisplayVectorGraph);
});
