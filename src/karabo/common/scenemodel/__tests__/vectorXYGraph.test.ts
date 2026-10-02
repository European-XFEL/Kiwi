import { readScene, VectorXYGraphModel } from '../api';

function readXY(attributes = '') {
  return readScene(`
    <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
      <svg:rect krb:class="DisplayComponent" krb:widget="VectorXYGraph" ${attributes} />
    </svg:svg>
  `).children[0] as VectorXYGraphModel;
}

test('constructs with grids but loads omitted scene grids as false', () => {
  const model = new VectorXYGraphModel();
  expect(model).toMatchObject({
    klass: 'VectorXYGraph',
    x_grid: true,
    y_grid: true,
  });
  expect(model).not.toHaveProperty('offset');
  expect(model).not.toHaveProperty('step');
  expect(model).not.toHaveProperty('maxlen');
  expect(readXY()).toBeInstanceOf(VectorXYGraphModel);
  expect(readXY()).toMatchObject({ x_grid: false, y_grid: false });
});

test('loads ordered keys and shared plot attributes', () => {
  expect(
    readXY(`krb:keys="device.x,device.y,device.z"
    krb:title="Position" krb:background="#123456"
    krb:x_label="X" krb:y_label="Y" krb:x_units="m" krb:y_units="s"
    krb:x_grid="true" krb:y_grid="true" krb:x_log="true" krb:y_log="true"
    krb:x_invert="true" krb:y_invert="true"
    krb:x_autorange="false" krb:y_autorange="false"
    krb:x_min="1" krb:x_max="10" krb:y_min="2" krb:y_max="20"`)
  ).toMatchObject({
    keys: ['device.x', 'device.y', 'device.z'],
    title: 'Position',
    background: '#123456',
    x_label: 'X',
    y_label: 'Y',
    x_units: 'm',
    y_units: 's',
    x_grid: true,
    y_grid: true,
    x_log: true,
    y_log: true,
    x_invert: true,
    y_invert: true,
    x_autorange: false,
    y_autorange: false,
    x_min: 1,
    x_max: 10,
    y_min: 2,
    y_max: 20,
  });
});
