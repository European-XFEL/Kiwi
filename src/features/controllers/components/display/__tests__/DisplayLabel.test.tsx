import { render, screen } from '@testing-library/react';
import { DisplayLabelModel } from '@/karabo/common/api';
import { AccessLevel } from '@/karabo/data/enums';
import {
  BindingRoot,
  DeviceProxy,
  PropertyProxy,
  StringBinding,
  DoubleBinding,
  FloatBinding,
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

function renderNumericLabel(
  binding: FloatBinding | DoubleBinding,
  unit = 'mm'
) {
  binding.unit_label = unit;
  const root = new DeviceProxy('DEV');
  root.binding = new BindingRoot();
  root.binding.value!.set('value', binding);
  const proxy = new PropertyProxy(root, 'value');
  const result = render(
    <DisplayLabel
      model={new DisplayLabelModel()}
      ctx={{ proxy, proxies: [proxy], userAccessLevel: AccessLevel.OBSERVER }}
    />
  );
  return result;
}

test('string bindings render their value and unit', () => {
  renderLabel('', 'READY', 'mm');
  expect(screen.getByText('READY mm')).toBeInTheDocument();
});

test.each([
  ['float', new FloatBinding({ value: 1.2345678 }), '1.2345678 mm'],
  ['double', new DoubleBinding({ value: 1.23456789 }), '1.2345679 mm'],
])(
  'numeric %s bindings render their formatted value',
  (_kind, binding, text) => {
    renderNumericLabel(binding);
    expect(screen.getByText(text)).toBeInTheDocument();
  }
);

test('ordinary bindings use the default grey background', () => {
  const { field } = renderLabel('', 'ERROR', 'mm');
  expect(screen.getByText('ERROR mm')).toBeInTheDocument();
  expect(field.style.backgroundColor).toBe('rgb(238, 238, 238)');
});

test('the no-context placeholder remains transparent', () => {
  render(<DisplayLabel model={new DisplayLabelModel()} />);
  expect(screen.getByTitle('No device binding').style.backgroundColor).toBe('');
});
