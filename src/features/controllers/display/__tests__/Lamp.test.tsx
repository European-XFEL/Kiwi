import { act, render, screen } from '@testing-library/react';
import { LampModel } from '@/karabo/common/api';
import { AccessLevel, Hash } from '@/karabo/data/api';
import {
  BoolBinding,
  DeviceProxy,
  PropertyProxy,
  StringBinding,
} from '@/lib/binding/api';
import { createMockSystemTopology, SingletonContext } from '@/testing';
import { useController } from '../../useController';
import { useProxies } from '../../useProxies';
import Lamp from '../Lamp';

jest.mock('../../utils/lampStateMapping', () => ({
  getLampAsset: (value: unknown) => `/lamp-${value ?? 'unknown'}.png`,
}));

function model() {
  const lamp = new LampModel();
  lamp.keys = ['DEV.status'];
  return lamp;
}

function binding(value?: string, displayType = 'State') {
  const result = new StringBinding();
  result.displayType = displayType;
  if (value !== undefined) result.setValue(value, undefined);
  return result;
}

function context(device: DeviceProxy) {
  const proxy = new PropertyProxy(device, 'status');
  return {
    proxy,
    proxies: [proxy],
    userAccessLevel: AccessLevel.OBSERVER,
  };
}

test.each([
  ['missing binding', undefined, 'Unknown', '/lamp-unknown.png'],
  [
    'non-string binding',
    new BoolBinding({ value: true }),
    'Unknown',
    '/lamp-true.png',
  ],
  [
    'string binding with a different display type',
    binding('ACTIVE', 'String'),
    'ACTIVE',
    '/lamp-ACTIVE.png',
  ],
] as const)(
  'renders the current value for %s',
  (_case, propertyBinding, alt, src) => {
    const device = new DeviceProxy('DEV');
    if (propertyBinding) device.binding.value!.set('status', propertyBinding);
    const ctx = context(device);
    render(<Lamp model={model()} ctx={ctx} />);
    expect(screen.getByRole('img', { name: alt })).toHaveAttribute('src', src);
    ctx.proxy.dispose();
  }
);

test('updates the image when the binding changes', () => {
  const device = new DeviceProxy('DEV');
  const ctx = context(device);
  const lamp = model();
  const { rerender } = render(<Lamp model={lamp} ctx={ctx} />);
  expect(screen.getByRole('img', { name: 'Unknown' })).toHaveAttribute(
    'src',
    '/lamp-unknown.png'
  );

  act(() => {
    device.binding.value!.set('status', binding('ACTIVE'));
    device.schema_update.fire();
  });
  rerender(<Lamp model={lamp} ctx={ctx} />);
  expect(screen.getByRole('img', { name: 'ACTIVE' })).toHaveAttribute(
    'src',
    '/lamp-ACTIVE.png'
  );

  act(() => {
    device.binding.value!.set('status', new BoolBinding({ value: true }));
    device.schema_update.fire();
  });
  rerender(<Lamp model={lamp} ctx={ctx} />);
  expect(screen.getByRole('img', { name: 'Unknown' })).toHaveAttribute(
    'src',
    '/lamp-true.png'
  );
  ctx.proxy.dispose();
});

test('shows the unknown lamp for a valid binding without a value', () => {
  const device = new DeviceProxy('DEV');
  device.binding.value!.set('status', binding());
  const ctx = context(device);
  render(<Lamp model={model()} ctx={ctx} />);
  expect(screen.getByRole('img', { name: 'Unknown' })).toHaveAttribute(
    'src',
    '/lamp-unknown.png'
  );
  ctx.proxy.dispose();
});

test('follows the named device property as it changes', async () => {
  const topology = createMockSystemTopology();
  const device = topology.getDevice('DEV');
  device.setOnlineFlag(true);
  device.binding.value!.set('status', binding('ACTIVE'));
  const lamp = model();

  function LampController() {
    const ctx = useController(useProxies(lamp.keys));
    return <Lamp model={lamp} ctx={ctx} />;
  }

  await SingletonContext.run({ topology }, async () => {
    const { unmount } = render(<LampController />);
    expect(screen.getByRole('img', { name: 'ACTIVE' })).toHaveAttribute(
      'src',
      '/lamp-ACTIVE.png'
    );

    act(() => device.handleDeviceConfiguration(new Hash('status', 'ERROR')));
    expect(screen.getByRole('img', { name: 'ERROR' })).toHaveAttribute(
      'src',
      '/lamp-ERROR.png'
    );
    unmount();
  });
});
