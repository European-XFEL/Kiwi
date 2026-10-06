import { render, screen } from '@testing-library/react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DisplayColorBoolModel } from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/enums';
import {
  BindingRoot,
  BoolBinding,
  DeviceProxy,
  PropertyProxy,
} from '@/lib/binding/api';
import getStateColor from '@/lib/Indicators';
import DisplayColorBool from '../DisplayColorBool';

function renderValue(value?: boolean, invert = false) {
  let ctx: ControllerContainerContext | undefined;
  if (value !== undefined) {
    const binding = new BoolBinding();
    binding.setValue(value, undefined);
    const root = new DeviceProxy('DEV');
    root.binding = new BindingRoot();
    root.binding.value!.set('enabled', binding);
    const proxy = new PropertyProxy(root, 'enabled');
    ctx = { proxy, proxies: [proxy], userAccessLevel: AccessLevel.OBSERVER };
  }

  const model = new DisplayColorBoolModel();
  model.invert = invert;
  render(<DisplayColorBool model={model} ctx={ctx} />);
  return screen
    .getByTestId('display-color-bool')
    .querySelector('circle')
    ?.getAttribute('fill');
}

test.each([
  [true, false, 'ACTIVE'],
  [false, false, 'PASSIVE'],
  [true, true, 'PASSIVE'],
  [false, true, 'ACTIVE'],
] as const)(
  'colors boolean value %s with invert %s',
  (value, invert, state) => {
    expect(renderValue(value, invert)).toBe(getStateColor(state));
  }
);

test('missing value leaves the indicator transparent', () => {
  expect(renderValue()).toBe('transparent');
});

test('sizes the outlined circle to the viewBox', () => {
  const model = new DisplayColorBoolModel();
  render(<DisplayColorBool model={model} />);

  const circle = screen
    .getByTestId('display-color-bool')
    .querySelector('circle');
  expect(circle).toHaveAttribute('cx', '50%');
  expect(circle).toHaveAttribute('cy', '50%');
  expect(circle).toHaveAttribute('r', '48%');
  expect(circle).toHaveAttribute('stroke-width', '4%');
});
