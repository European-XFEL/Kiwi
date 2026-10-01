import DisplayBarGraph from '../display/DisplayBarGraph';
import DisplayVectorGraph from '../display/DisplayVectorGraph';
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
  expect(DisplayBarGraph).not.toBe(DisplayVectorGraph);
});
