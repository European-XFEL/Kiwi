import {
  DisplayVectorGraphModel,
  readScene,
  VectorBarGraphModel,
} from '../api';

function readPlot(widget: string, attributes = '') {
  const scene = readScene(`
    <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
      <svg:rect krb:class="DisplayComponent" krb:widget="${widget}" ${attributes} />
    </svg:svg>
  `);
  return scene.children[0];
}

test('reads vector bar graph fields and the default width', () => {
  const graph = readPlot(
    'VectorBarGraph',
    'krb:title="Counts" krb:y_label="Signal" krb:y_invert="true"'
  ) as VectorBarGraphModel;
  expect(graph).toBeInstanceOf(VectorBarGraphModel);
  expect(graph).not.toBeInstanceOf(DisplayVectorGraphModel);
  expect(graph.klass).toBe('VectorBarGraph');
  expect(graph.title).toBe('Counts');
  expect(graph.y_label).toBe('Signal');
  expect(graph.y_invert).toBe(true);
  expect(graph.bar_width).toBe(0.1);
  expect(
    (readPlot('VectorBarGraph', 'krb:bar_width="0.75"') as VectorBarGraphModel)
      .bar_width
  ).toBe(0.75);
});

test('keeps vector line fields in its separate reader', () => {
  const graph = readPlot(
    'VectorGraph',
    'krb:x_label="Index" krb:offset="2" krb:step="0.5" krb:roi_tool="1" krb:roi_items="legacy"'
  ) as DisplayVectorGraphModel;
  expect(graph).toBeInstanceOf(DisplayVectorGraphModel);
  expect(graph.x_label).toBe('Index');
  expect([graph.offset, graph.step]).toEqual([2, 0.5]);
  expect(graph).not.toHaveProperty('roi_tool');
  expect(graph).not.toHaveProperty('roi_items');
});
