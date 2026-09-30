import { render, screen } from '@testing-library/react';
import {
  DisplayAlarmFloatModel,
  DisplayFloatModel,
  DisplayLabelModel,
} from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/enums';
import {
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  FloatBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import DisplayAlarmFloat from '../DisplayAlarmFloat';
import DisplayFloat from '../DisplayFloat';
import DisplayLabel from '../DisplayLabel';

function contextFor(binding: FloatBinding | DoubleBinding, value: number) {
  binding.setValue(value, undefined);
  binding.unit_label = 'mm';
  const root = new DeviceProxy('DEV');
  root.binding = new BindingRoot();
  root.binding.value!.set('value', binding);
  const proxy = new PropertyProxy(root, 'value');
  return { proxy, proxies: [proxy], userAccessLevel: AccessLevel.OBSERVER };
}

test.each([
  [0.1, '0.1 mm'],
  [1.2345678, '1.2345678 mm'],
  [1e-5, '1e-5 mm'],
  [1e8, '1e+8 mm'],
  [1e-45, '1e-45 mm'],
  [-0, '0 mm'],
  [NaN, 'nan mm'],
])(
  'DisplayLabel formats float32 %s without widened precision noise',
  (value, text) => {
    const ctx = contextFor(new FloatBinding(), value);
    render(<DisplayLabel model={new DisplayLabelModel()} ctx={ctx} />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(ctx.proxy.value).toBe(Math.fround(value));
  }
);

test('DisplayLabel formats doubles to eight significant digits without float32 conversion', () => {
  const ctx = contextFor(new DoubleBinding(), 1.23456789);
  render(<DisplayLabel model={new DisplayLabelModel()} ctx={ctx} />);
  expect(screen.getByText('1.2345679 mm')).toBeInTheDocument();
  expect(ctx.proxy.value).toBe(1.23456789);
});

test.each([
  ['f', '8', '0.10000000 mm'],
  ['e', '8', '1.00000000e-1 mm'],
  ['g', '8', '0.1 mm'],
])(
  'DisplayFloat normalizes float32 before applying %s precision %s',
  (fmt, decimals, text) => {
    const model = new DisplayFloatModel();
    model.fmt = fmt;
    model.decimals = decimals;
    render(
      <DisplayFloat model={model} ctx={contextFor(new FloatBinding(), 0.1)} />
    );
    expect(screen.getByText(text)).toBeInTheDocument();
  }
);

test('DisplayFloat retains double precision with a configured fixed format', () => {
  const model = new DisplayFloatModel();
  model.fmt = 'f';
  model.decimals = '12';
  render(
    <DisplayFloat
      model={model}
      ctx={contextFor(new DoubleBinding(), 1.234567890123)}
    />
  );
  expect(screen.getByText('1.234567890123 mm')).toBeInTheDocument();
});

test('DisplayAlarmFloat formats the normalized decimal but compares the original value', () => {
  const model = new DisplayAlarmFloatModel();
  model.fmt = 'f';
  model.decimals = '8';
  model.alarmHigh = 0.100000001;
  const ctx = contextFor(new FloatBinding(), 0.1);
  render(<DisplayAlarmFloat model={model} ctx={ctx} />);
  expect(screen.getByText('0.10000000 mm')).toHaveStyle({
    backgroundColor: '#ff4444',
  });
  expect(ctx.proxy.value).toBeGreaterThan(model.alarmHigh);
});
