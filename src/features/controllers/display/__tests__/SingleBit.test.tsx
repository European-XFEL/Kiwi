import { act, render, screen } from '@testing-library/react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { SingleBitModel } from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/enums';
import { getStateColor } from '@/lib/Indicators';
import {
  BaseBinding,
  BindingRoot,
  DeviceProxy,
  Int64Binding,
  PropertyProxy,
  UInt64Binding,
} from '@/lib/binding/api';
import SingleBit from '../SingleBit';

function createContext(value?: unknown, binding = new BaseBinding()) {
  if (value !== undefined) binding.setValue(value, undefined);
  const root = new DeviceProxy('DEV');
  root.binding = new BindingRoot();
  root.binding.value!.set('status', binding);
  const proxy = new PropertyProxy(root, 'status');
  const ctx: ControllerContainerContext = {
    proxy,
    proxies: [proxy],
    userAccessLevel: AccessLevel.OBSERVER,
  };
  return { binding, ctx };
}

function expectBackground(state?: 'ACTIVE' | 'PASSIVE') {
  const element = screen.getByTestId('single-bit');
  if (state) {
    expect(element).toHaveStyle({ backgroundColor: getStateColor(state) });
  } else {
    expect(element.style.backgroundColor).toBe('transparent');
  }
}

test.each([
  [0, 0, false],
  [1, 0, true],
  [2, 0, false],
  [2, 1, true],
  [2, 2, false],
  [2 ** 32, 32, true],
  [2 ** 32, 0, false],
  [-1, 7, true],
  [-2, 0, false],
  [-2, 1, true],
  [1n << 63n, 63, true],
  [1n << 63n, 0, false],
] as const)('renders value %s at bit %s', (value, bit, bitSet) => {
  const { ctx } = createContext(value);
  const model = new SingleBitModel();
  model.bit = bit;
  const { rerender } = render(<SingleBit model={model} ctx={ctx} />);
  expectBackground(bitSet ? 'ACTIVE' : 'PASSIVE');
  model.invert = true;
  rerender(<SingleBit model={model} ctx={ctx} />);
  expectBackground(bitSet ? 'PASSIVE' : 'ACTIVE');
});

test.each([
  [new UInt64Binding(), 1n << 63n],
  [new Int64Binding(), -(1n << 63n)],
])('reads the high bit from a 64-bit binding %s', (binding, value) => {
  const { ctx } = createContext(value, binding);
  const model = new SingleBitModel();
  model.bit = 63;
  render(<SingleBit model={model} ctx={ctx} />);
  expectBackground('ACTIVE');
});

test.each([
  undefined,
  null,
  true,
  '1',
  {},
  [],
  0.5,
  NaN,
  Infinity,
  Number.MAX_SAFE_INTEGER + 1,
])('shows a transparent background for unsupported value %s', (value) => {
  const { ctx } = createContext(value);
  const model = new SingleBitModel();
  model.invert = true;
  render(<SingleBit model={model} ctx={ctx} />);
  expectBackground();
});

test.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  'shows a transparent background for invalid bit %s',
  (bit) => {
    const { ctx } = createContext(1);
    const model = new SingleBitModel();
    model.bit = bit;
    render(<SingleBit model={model} ctx={ctx} />);
    expectBackground();
  }
);

test('shows a transparent background without context', () => {
  render(<SingleBit model={new SingleBitModel()} />);
  expectBackground();
});

test('updates binding values, model fields, and model replacements', () => {
  const { ctx, binding } = createContext(1);
  const model = new SingleBitModel();
  const { rerender } = render(<SingleBit model={model} ctx={ctx} />);
  expectBackground('ACTIVE');
  act(() => binding.setValue(2, undefined));
  rerender(<SingleBit model={model} ctx={ctx} />);
  expectBackground('PASSIVE');
  model.bit = 1;
  rerender(<SingleBit model={model} ctx={ctx} />);
  expectBackground('ACTIVE');
  model.invert = true;
  rerender(<SingleBit model={model} ctx={ctx} />);
  expectBackground('PASSIVE');
  const replacement = new SingleBitModel();
  replacement.bit = 1;
  rerender(<SingleBit model={replacement} ctx={ctx} />);
  expectBackground('ACTIVE');
  act(() => binding.setValue(undefined, undefined));
  rerender(<SingleBit model={replacement} ctx={ctx} />);
  expectBackground();
});

test('fills the scene area with a black rounded border even without a value', () => {
  render(<SingleBit model={new SingleBitModel()} />);
  expect(screen.getByTestId('single-bit')).toHaveClass('w-full', 'h-full');
  expect(screen.getByTestId('single-bit')).toHaveStyle({
    'box-sizing': 'border-box',
    border: '2px solid black',
    'border-radius': '6px',
  });
  expectBackground();
});
