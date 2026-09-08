import { render } from '@testing-library/react';
import { DisplayAlarmFloatModel } from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/enums';
import {
  BindingRoot,
  DeviceProxy,
  PropertyProxy,
  DoubleBinding,
} from '@/lib/binding/api';
import DisplayAlarmFloat from '../DisplayAlarmFloat';

function renderAlarm(value: number | undefined, model: DisplayAlarmFloatModel) {
  const binding = new DoubleBinding();
  if (value !== undefined) binding.setValue(value, undefined);
  const root = new DeviceProxy('DEV');
  root.binding = new BindingRoot();
  root.binding.value!.set('value', binding);
  const proxy = new PropertyProxy(root, 'value');
  const ctx = {
    proxy,
    proxies: [proxy],
    userAccessLevel: AccessLevel.OBSERVER,
  };
  const { container } = render(<DisplayAlarmFloat model={model} ctx={ctx} />);
  return container.firstElementChild as HTMLElement;
}

test.each([
  ['below alarmLow', -1, 'rgb(255, 68, 68)'],
  ['at alarmLow', 0, 'rgb(255, 68, 68)'],
  ['above alarmHigh', 11, 'rgb(255, 68, 68)'],
  ['at alarmHigh', 10, 'rgb(255, 68, 68)'],
  ['low warning band', 1, 'rgb(255, 170, 0)'],
  ['high warning band', 9, 'rgb(255, 170, 0)'],
  ['in range', 5, 'rgb(238, 238, 238)'],
] as const)('%s retains the correct background', (_name, value, color) => {
  const model = new DisplayAlarmFloatModel();
  Object.assign(model, { alarmLow: 0, warnLow: 2, warnHigh: 8, alarmHigh: 10 });
  expect(renderAlarm(value, model).style.backgroundColor).toBe(color);
});

test.each([undefined, NaN])(
  'absent/non-finite value %s uses grey, even with thresholds',
  (value) => {
    const model = new DisplayAlarmFloatModel();
    Object.assign(model, { alarmLow: 0, alarmHigh: 10 });
    expect(renderAlarm(value, model).style.backgroundColor).toBe(
      'rgb(238, 238, 238)'
    );
  }
);

test('a value without thresholds uses grey', () => {
  expect(
    renderAlarm(42, new DisplayAlarmFloatModel()).style.backgroundColor
  ).toBe('rgb(238, 238, 238)');
});
