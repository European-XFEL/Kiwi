import { act, render, screen } from '@testing-library/react';
import { GlobalAlarmModel } from '@/karabo/common/api';
import { AccessLevel, Hash } from '@/karabo/data/api';
import { DeviceProxy, PropertyProxy, StringBinding } from '@/lib/binding/api';
import { createMockSystemTopology, SingletonContext } from '@/testing';
import { useController } from '../../useController';
import { useProxies } from '../../useProxies';
import DisplayAlarm from '../DisplayAlarm';

jest.mock('@/assets/icons', () => ({
  __esModule: true,
  default: {
    alarmNone: 'alarm_none.svg',
    warnGlobal: 'warning.svg',
    alarmGlobal: 'critical.svg',
    interlock: 'interlock.svg',
    deviceOffline: 'offline-32x32.png',
  },
}));

function alarmProxy(value?: string, online = true) {
  const root = new DeviceProxy('DEV');
  root.setOnlineFlag(online);
  const binding = new StringBinding();
  if (value !== undefined) binding.setValue(value, undefined);
  root.binding.value!.set('alarm', binding);
  return new PropertyProxy(root, 'alarm');
}

function displayedAsset() {
  return screen.getByRole('img').querySelector('image')?.getAttribute('href');
}

test.each([
  ['none', 'alarm_none.svg', 'No alarm'],
  ['warn', 'warning.svg', 'Warning'],
  ['alarm', 'critical.svg', 'Alarm'],
  ['interlock', 'interlock.svg', 'Interlock'],
  [undefined, 'offline-32x32.png', 'Not available'],
  ['unknown', 'offline-32x32.png', 'Not available'],
  ['WARN', 'offline-32x32.png', 'Not available'],
  ['warnHigh', 'offline-32x32.png', 'Not available'],
  ['', 'offline-32x32.png', 'Not available'],
])('displays %s as %s', (value, asset, label) => {
  const proxy = alarmProxy(value);
  render(
    <DisplayAlarm
      model={new GlobalAlarmModel()}
      ctx={{
        proxy,
        proxies: [proxy],
        userAccessLevel: AccessLevel.OBSERVER,
      }}
    />
  );
  expect(displayedAsset()).toBe(asset);
  expect(screen.getByRole('img', { name: label })).toBeInTheDocument();
});

test('uses unavailable artwork without a context and fills the widget without padding', () => {
  render(<DisplayAlarm model={new GlobalAlarmModel()} />);
  expect(displayedAsset()).toBe('offline-32x32.png');
  expect(
    screen.getByRole('img', { name: 'Not available' })
  ).toBeInTheDocument();
  const svg = screen.getByRole('img');
  expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
  expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
  expect(svg).toHaveStyle({ display: 'block', width: '100%', height: '100%' });
  expect(svg.querySelector('image')).toHaveAttribute(
    'preserveAspectRatio',
    'none'
  );
});

test('ignores additional proxies, including when the primary proxy is absent', () => {
  const primary = alarmProxy('none');
  const secondary = alarmProxy('interlock');
  const model = new GlobalAlarmModel();
  const { rerender } = render(
    <DisplayAlarm
      model={model}
      ctx={{
        proxy: primary,
        proxies: [primary, secondary],
        userAccessLevel: AccessLevel.OBSERVER,
      }}
    />
  );
  expect(displayedAsset()).toBe('alarm_none.svg');
  rerender(
    <DisplayAlarm
      model={model}
      ctx={{
        proxy: undefined,
        proxies: [secondary],
        userAccessLevel: AccessLevel.OBSERVER,
      }}
    />
  );
  expect(displayedAsset()).toBe('offline-32x32.png');
});

test('follows configuration, offline cached values, and recovery through controller subscriptions', async () => {
  const topology = createMockSystemTopology();
  const device = topology.getDevice('DEV');
  device.setOnlineFlag(true);
  device.binding.value!.set('alarm', new StringBinding({ value: 'none' }));
  const model = new GlobalAlarmModel();
  model.keys = ['DEV.alarm'];
  function AlarmController() {
    const ctx = useController(useProxies(model.keys));
    return <DisplayAlarm model={model} ctx={ctx} />;
  }
  await SingletonContext.run({ topology }, async () => {
    const { unmount } = render(<AlarmController />);
    expect(displayedAsset()).toBe('alarm_none.svg');
    act(() => device.handleDeviceConfiguration(new Hash('alarm', 'warn')));
    expect(displayedAsset()).toBe('warning.svg');
    act(() => device.setOnlineFlag(false));
    expect(device.getBinding('alarm')?.getValue()).toBe('warn');
    expect(displayedAsset()).toBe('warning.svg');
    expect(screen.getByRole('img', { name: 'Warning' })).toBeInTheDocument();
    act(() => device.setOnlineFlag(true));
    expect(displayedAsset()).toBe('warning.svg');
    act(() => device.handleDeviceConfiguration(new Hash('alarm', 'interlock')));
    expect(displayedAsset()).toBe('interlock.svg');
    unmount();
  });
});
