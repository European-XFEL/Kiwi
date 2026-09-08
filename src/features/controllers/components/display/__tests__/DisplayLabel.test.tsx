import { render, screen } from '@testing-library/react';
import { DisplayLabelModel } from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/enums';
import {
  BindingRoot,
  DeviceProxy,
  PropertyProxy,
  StringBinding,
} from '@/lib/binding/api';
import DisplayLabel from '../DisplayLabel';

function renderLabel(displayType: string, value?: string, unit = '') {
  const binding = new StringBinding({ value });
  binding.displayType = displayType;
  binding.unit_label = unit;
  const root = new DeviceProxy('DEV');
  root.binding = new BindingRoot();
  root.binding.value!.set('value', binding);
  const proxy = new PropertyProxy(root, 'value');
  const model = new DisplayLabelModel();
  const ctx = {
    proxy,
    proxies: [proxy],
    userAccessLevel: AccessLevel.OBSERVER,
  };
  const result = render(<DisplayLabel model={model} ctx={ctx} />);
  return {
    ...result,
    field: result.container.firstElementChild as HTMLElement,
  };
}

test('state bindings paint their state colour without a scene provider', () => {
  const { field } = renderLabel('State', 'ERROR');
  expect(field.style.backgroundColor).toBe('rgb(255, 0, 0)');
});

test.each([undefined, '', 'UNRECOGNIZED_STATE'])(
  'missing or invalid state %s is transparent',
  (value) => {
    expect(renderLabel('State', value).field.style.backgroundColor).toBe(
      'rgba(0, 0, 0, 0)'
    );
  }
);

test('the valid UNKNOWN state keeps the existing amber colour', () => {
  expect(renderLabel('State', 'UNKNOWN').field.style.backgroundColor).toBe(
    'rgb(255, 170, 0)'
  );
});

test('ordinary values use grey even when their text names a state', () => {
  expect(renderLabel('', 'ERROR').field.style.backgroundColor).toBe(
    'rgb(238, 238, 238)'
  );
});

test('units remain in the label but do not affect state colour lookup', () => {
  const { field } = renderLabel('State', 'ERROR', 'mm');
  expect(screen.getByText('ERROR mm')).toBeInTheDocument();
  expect(field.style.backgroundColor).toBe('rgb(255, 0, 0)');
});

test('the no-context placeholder remains transparent', () => {
  render(<DisplayLabel model={new DisplayLabelModel()} />);
  expect(screen.getByTitle('No device binding').style.backgroundColor).toBe('');
});
