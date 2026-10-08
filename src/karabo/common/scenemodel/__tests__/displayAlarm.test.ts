import {
  BaseWidgetObjectData,
  GlobalAlarmModel,
  readerRegistry,
  readScene,
} from '../api';

test('defaults to the GlobalAlarm display model', () => {
  const model = new GlobalAlarmModel();
  expect(model).toBeInstanceOf(BaseWidgetObjectData);
  expect(model.klass).toBe('GlobalAlarm');
  expect(model.parent_component).toBe('DisplayComponent');
});

test('reads GlobalAlarm scene data using the single registered name', () => {
  expect(readerRegistry.has('DisplayAlarm')).toBe(false);
  const scene = readScene(`
    <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
      <svg:rect krb:class="DisplayComponent" krb:widget="GlobalAlarm"
        krb:keys="DEV.alarm, OTHER.alarm" x="1" y="2" width="30" height="40" />
    </svg:svg>
  `);
  expect(scene.children[0]).toBeInstanceOf(GlobalAlarmModel);
  expect(scene.children[0]).toMatchObject({
    klass: 'GlobalAlarm',
    parent_component: 'DisplayComponent',
    keys: ['DEV.alarm', 'OTHER.alarm'],
    x: 1,
    y: 2,
    width: 30,
    height: 40,
  });
});
