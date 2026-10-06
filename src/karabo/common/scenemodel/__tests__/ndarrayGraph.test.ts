import {
  BasePlotModel,
  DisplayVectorGraphModel,
  NDArrayGraphModel,
  readScene,
} from '../api';

function readGraph(attributes = '') {
  return readScene(`
    <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
      <svg:rect krb:class="DisplayComponent" krb:widget="NDArrayGraph" ${attributes} />
    </svg:svg>
  `).children[0] as NDArrayGraphModel;
}

test('reads NDArray graph identity, geometry, and plot settings', () => {
  const graph = readGraph(`
    krb:keys="DEV.array" x="12" y="34" width="320" height="240"
    krb:title="Samples" krb:background="black"
    krb:x_label="Position" krb:y_label="Signal" krb:x_units="s" krb:y_units="V"
    krb:x_log="true" krb:y_log="true" krb:x_invert="true" krb:y_invert="true"
    krb:x_autorange="false" krb:y_autorange="false"
    krb:x_min="-2" krb:x_max="8" krb:y_min="-4" krb:y_max="16"
    krb:offset="2" krb:step="0.5"
  `);
  expect(graph).toBeInstanceOf(NDArrayGraphModel);
  expect(graph).toBeInstanceOf(BasePlotModel);
  expect(graph).not.toBeInstanceOf(DisplayVectorGraphModel);
  expect(graph).toMatchObject({
    klass: 'NDArrayGraph',
    keys: ['DEV.array'],
    x: 12,
    y: 34,
    width: 320,
    height: 240,
    title: 'Samples',
    background: 'black',
    x_label: 'Position',
    y_label: 'Signal',
    x_units: 's',
    y_units: 'V',
    x_log: true,
    y_log: true,
    x_invert: true,
    y_invert: true,
    x_autorange: false,
    y_autorange: false,
    x_min: -2,
    x_max: 8,
    y_min: -4,
    y_max: 16,
    offset: 2,
    step: 0.5,
  });
});

test('defaults to enabled grids and identity transformation', () => {
  for (const graph of [new NDArrayGraphModel(), readGraph()]) {
    expect(graph).toMatchObject({
      x_grid: true,
      y_grid: true,
      offset: 0,
      step: 1,
    });
  }
  expect(readGraph('krb:x_grid="false" krb:y_grid="false"')).toMatchObject({
    x_grid: false,
    y_grid: false,
  });
});
