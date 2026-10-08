import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import {
  DisplayColorBoolModel,
  DisplayErrorBoolModel,
} from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/enums';
import {
  BaseBinding,
  BindingRoot,
  DeviceProxy,
  PropertyProxy,
} from '@/lib/binding/api';
import DisplayColorBool from '../DisplayColorBool';
import DisplayErrorBool from '../DisplayErrorBool';

function createContext(value?: unknown) {
  const binding = new BaseBinding();
  if (value !== undefined) binding.setValue(value, undefined);
  const root = new DeviceProxy('DEV');
  root.binding = new BindingRoot();
  root.binding.value!.set('enabled', binding);
  const proxy = new PropertyProxy(root, 'enabled');
  const ctx: ControllerContainerContext = {
    proxy,
    proxies: [proxy],
    userAccessLevel: AccessLevel.OBSERVER,
    setTooltip: jest.fn(),
  };
  return { binding, ctx };
}

describe.each([
  ['color', DisplayColorBool, DisplayColorBoolModel],
  ['error', DisplayErrorBool, DisplayErrorBoolModel],
] as const)('%s boolean indicator', (kind, Widget, Model) => {
  function expectIcon(active: boolean | undefined) {
    const element = screen.getByTestId(`display-${kind}-bool`);
    if (active === undefined) {
      expect(element.querySelector('img')).toHaveAttribute(
        'src',
        'unknown-bool-icon'
      );
    } else if (kind === 'error') {
      expect(element.querySelector('img')).toHaveAttribute(
        'src',
        active ? 'ok-bool-icon' : 'error-bool-icon'
      );
    } else {
      expect(element.querySelector('img')).toHaveAttribute(
        'src',
        active ? 'switch-bool-active-icon' : 'switch-bool-passive-icon'
      );
    }
  }

  test.each([
    [true, false, true, 'True'],
    [false, false, false, 'False'],
    [true, true, false, 'Inverted: True'],
    [false, true, true, 'Inverted: False'],
  ] as const)(
    'renders value %s inverted %s',
    (value, invert, active, tooltip) => {
      const { ctx } = createContext(value);
      const model = new Model();
      model.invert = invert;
      render(<Widget model={model} ctx={ctx} />);
      expectIcon(active);
      expect(ctx.setTooltip).toHaveBeenLastCalledWith(
        `DEV.enabled\n${tooltip}`
      );
    }
  );

  test.each([false, true])(
    'shows an unknown icon for missing values with inversion %s',
    (invert) => {
      const { ctx } = createContext();
      const model = new Model();
      model.invert = invert;
      render(<Widget model={model} ctx={ctx} />);
      expectIcon(undefined);
      const tooltip = invert ? 'Inverted: Unknown' : 'Unknown';
      expect(ctx.setTooltip).toHaveBeenLastCalledWith(
        `DEV.enabled\n${tooltip}`
      );
    }
  );

  test('shows an unknown icon without a proxy', () => {
    render(<Widget model={new Model()} />);
    expectIcon(undefined);
  });

  test('returns to the unknown icon when a value is cleared', () => {
    const { ctx, binding } = createContext(true);
    const model = new Model();
    const { rerender } = render(<Widget model={model} ctx={ctx} />);
    expectIcon(true);
    act(() => binding.setValue(undefined, undefined));
    rerender(<Widget model={model} ctx={ctx} />);
    expectIcon(undefined);
    expect(ctx.setTooltip).toHaveBeenLastCalledWith('DEV.enabled\nUnknown');
  });

  test.each([
    [1, true],
    ['1', true],
    ['true', true],
    [0, false],
    ['', false],
    ['false', true],
    ['0', true],
  ] as const)('casts %j with Boolean', (value, expected) => {
    const { ctx } = createContext(value);
    render(<Widget model={new Model()} ctx={ctx} />);
    expectIcon(expected);
  });

  test('uses model inversion and exposes no context menu', () => {
    const { ctx } = createContext(true);
    const model = new Model();
    const { rerender } = render(<Widget model={model} ctx={ctx} />);
    for (const inverted of [true, false]) {
      model.invert = inverted;
      rerender(<Widget model={model} ctx={ctx} />);
      fireEvent.contextMenu(screen.getByTestId(`display-${kind}-bool`));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(model.invert).toBe(inverted);
      expectIcon(!inverted);
      expect(ctx.setTooltip).toHaveBeenLastCalledWith(
        `DEV.enabled\n${inverted ? 'Inverted: True' : 'True'}`
      );
    }
  });

  test('updates values and replaces models without retaining inversion', () => {
    const { ctx, binding } = createContext(true);
    const model = new Model();
    model.invert = true;
    const { rerender, unmount } = render(<Widget model={model} ctx={ctx} />);
    expectIcon(false);
    act(() => binding.setValue(false, undefined));
    rerender(<Widget model={model} ctx={ctx} />);
    expectIcon(true);
    const replacement = new Model();
    rerender(<Widget model={replacement} ctx={ctx} />);
    expectIcon(false);
    unmount();
    expect(ctx.setTooltip).toHaveBeenLastCalledWith(undefined);
  });

  test('caps icons to Qt dimensions within the allocated scene area', () => {
    const { ctx } = createContext(true);
    render(<Widget model={new Model()} ctx={ctx} />);
    const element = screen.getByTestId(`display-${kind}-bool`);
    expect(element).toHaveClass(
      'w-full',
      'h-full',
      'flex',
      'items-center',
      'justify-center'
    );
    expect(element.querySelector('img')).toHaveClass(
      'w-full',
      'h-full',
      'max-w-6',
      'max-h-6'
    );
  });
});
