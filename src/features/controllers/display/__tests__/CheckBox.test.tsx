import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { CheckBoxModel } from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/enums';
import {
  BaseBinding,
  BindingRoot,
  DeviceProxy,
  PropertyProxy,
} from '@/lib/binding/api';
import { DisplayCheckBox } from '../CheckBox';

function createContext(value?: unknown) {
  const binding = new BaseBinding();
  binding.setValue(value, undefined);
  const root = new DeviceProxy('DEV');
  root.binding = new BindingRoot();
  root.binding.value!.set('enabled', binding);
  const proxy = new PropertyProxy(root, 'enabled');
  const ctx: ControllerContainerContext = {
    proxy,
    proxies: [proxy],
    userAccessLevel: AccessLevel.EXPERT,
  };
  return { binding, ctx, proxy };
}

function expectIndicator(checked: boolean) {
  const image = screen.getByRole('img', { name: String(checked) });
  expect(image).toHaveAttribute(
    'src',
    checked ? 'checkbox-checked-icon' : 'checkbox-unchecked-icon'
  );
  return image;
}

describe('DisplayCheckBox', () => {
  test.each([true, false])('renders and updates value %s', (value) => {
    const { binding, ctx } = createContext(value);
    const model = new CheckBoxModel();
    const { rerender } = render(<DisplayCheckBox model={model} ctx={ctx} />);
    expectIndicator(value);
    act(() => binding.setValue(!value, undefined));
    rerender(<DisplayCheckBox model={model} ctx={ctx} />);
    expectIndicator(!value);
  });

  test('uses the unchecked fallback without context', () => {
    render(<DisplayCheckBox model={new CheckBoxModel()} />);
    expectIndicator(false);
  });

  test('uses the unchecked fallback for missing and cleared values', () => {
    const { binding, ctx } = createContext();
    const model = new CheckBoxModel();
    const { rerender } = render(<DisplayCheckBox model={model} ctx={ctx} />);
    expectIndicator(false);
    act(() => binding.setValue(true, undefined));
    rerender(<DisplayCheckBox model={model} ctx={ctx} />);
    expectIndicator(true);
    act(() => binding.setValue(undefined, undefined));
    rerender(<DisplayCheckBox model={model} ctx={ctx} />);
    expectIndicator(false);
  });

  test.each([
    [0, false],
    [1, true],
    [-1, true],
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
    ['', false],
    ['True', false],
    [null, false],
  ] as const)('preserves conversion of %j to %s', (value, checked) => {
    const { ctx } = createContext(value);
    render(<DisplayCheckBox model={new CheckBoxModel()} ctx={ctx} />);
    expectIndicator(checked);
  });

  test('cannot stage edits by clicking or pressing Space and is skipped by Tab', async () => {
    const user = userEvent.setup();
    const { ctx, proxy } = createContext(true);
    render(
      <>
        <button>Before</button>
        <DisplayCheckBox model={new CheckBoxModel()} ctx={ctx} />
        <button>After</button>
      </>
    );
    const image = expectIndicator(true);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(image.tabIndex).toBe(-1);
    await user.click(image);
    fireEvent.keyDown(image, { key: ' ', code: 'Space' });
    fireEvent.keyUp(image, { key: ' ', code: 'Space' });
    expect(proxy.edit_value).toBeUndefined();
    expectIndicator(true);
    screen.getByRole('button', { name: 'Before' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    await user.keyboard(' ');
    expect(proxy.edit_value).toBeUndefined();
  });
});
