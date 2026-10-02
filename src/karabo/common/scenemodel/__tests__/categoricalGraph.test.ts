import {
  readScene,
  BaseTrendModel,
  DisplayTrendGraphModel,
  DisplayStateGraphModel,
  DisplayAlarmGraphModel,
} from '../api';

it.each([
  DisplayTrendGraphModel,
  DisplayStateGraphModel,
  DisplayAlarmGraphModel,
])(
  'keeps %p model defaults and reads grid attributes directly with shared settings',
  (Model) => {
    const model = new Model();
    const read = (attributes = '') =>
      readScene(`
    <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
      <svg:rect krb:class="DisplayComponent" krb:widget="${model.klass}" ${attributes} />
    </svg:svg>
  `).children[0];
    expect(model).toMatchObject({ x_grid: true, y_grid: true });
    expect(model).toBeInstanceOf(BaseTrendModel);
    expect(read()).toBeInstanceOf(Model);
    expect(read()).toMatchObject({
      klass: model.klass,
      x_grid: false,
      y_grid: false,
      x_autorange: true,
      y_autorange: true,
    });
    expect(read('krb:x_grid="true" krb:y_grid="true"')).toMatchObject({
      x_grid: true,
      y_grid: true,
    });
    expect(
      read(`krb:keys="device.a,device.b" krb:title="Status" krb:background="#123456"
    krb:x_label="Time" krb:y_label="State" krb:x_units="s" krb:y_units="category"
    krb:x_grid="false" krb:y_grid="false" krb:x_log="true" krb:y_log="true"
    krb:x_invert="true" krb:y_invert="true" krb:x_autorange="false" krb:y_autorange="false"
    krb:x_min="1" krb:x_max="10" krb:y_min="2" krb:y_max="20"`)
    ).toMatchObject({
      keys: ['device.a', 'device.b'],
      title: 'Status',
      background: '#123456',
      x_label: 'Time',
      y_label: 'State',
      x_units: 's',
      y_units: 'category',
      x_grid: false,
      y_grid: false,
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
  }
);
