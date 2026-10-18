import { act, cleanup, render, screen, within } from '@testing-library/react';
import { HashAttributes } from '@/karabo/data/hash';
import { BoolValue, Int32Value, StringValue } from '@/karabo/data/types';
import {
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import { SceneBindingTooltip } from '../SceneBindingTooltip';

it('expires after five seconds and cancels expiry on unmount', () => {
  jest.useFakeTimers();
  const onDismiss = jest.fn();
  const view = render(
    <SceneBindingTooltip
      proxy={makeProxy()}
      clientX={0}
      clientY={0}
      onDismiss={onDismiss}
    />
  );
  act(() => jest.advanceTimersByTime(4999));
  expect(onDismiss).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(onDismiss).toHaveBeenCalledTimes(1);
  view.unmount();
  const second = render(
    <SceneBindingTooltip
      proxy={makeProxy()}
      clientX={0}
      clientY={0}
      onDismiss={onDismiss}
    />
  );
  second.unmount();
  act(() => jest.advanceTimersByTime(5000));
  expect(onDismiss).toHaveBeenCalledTimes(1);
  cleanup();
  jest.useRealTimers();
});

function makeProxy(attributes = new HashAttributes()) {
  const device = new DeviceProxy('DEV');
  device.binding = new BindingRoot();
  device.binding.value!.set('speed', new DoubleBinding({ attributes }));
  return new PropertyProxy(device, 'speed');
}

it('renders literal description and attributes in KaraboGui order, preserving wrapped and falsy values', () => {
  const attributes = new HashAttributes({
    options: ['a', 'b'],
    maxExc: 9,
    minExc: -9,
    maxInc: 8,
    minInc: new Int32Value(0),
    displayType: '',
    metricPrefixSymbol: 'm',
    unitSymbol: 's',
    valueType: 'BOOL',
    defaultValue: new BoolValue(false),
    displayedName: new StringValue('Speed'),
    description: '<b>literal & text</b>',
    ignored: 'hidden',
  });
  render(
    <SceneBindingTooltip
      proxy={makeProxy(attributes)}
      clientX={40}
      clientY={60}
      onDismiss={() => {}}
    />
  );
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip).toHaveTextContent('<b>literal & text</b>');
  expect(tooltip.querySelector('b')).toBeNull();
  expect(
    within(tooltip)
      .getAllByRole('row')
      .map((row) => row.textContent)
  ).toEqual([
    'keyDEV.speed',
    'displayedNameSpeed',
    'defaultValue0',
    'valueTypeBOOL',
    'unitSymbols',
    'metricPrefixSymbolm',
    'displayType',
    'minInc0',
    'maxInc8',
    'minExc-9',
    'maxExc9',
    'optionsa,b',
  ]);
  expect(tooltip).not.toHaveTextContent('hidden');
});

it('omits absent and null attributes and empty description', () => {
  render(
    <SceneBindingTooltip
      proxy={makeProxy(
        new HashAttributes({ displayedName: null, description: '' })
      )}
      clientX={0}
      clientY={0}
      onDismiss={() => {}}
    />
  );
  const tooltip = screen.getByRole('tooltip');
  expect(within(tooltip).getAllByRole('row')).toHaveLength(1);
  expect(tooltip.querySelector('p')).toBeNull();
});

it('renders nothing without a binding', () => {
  const proxy = makeProxy();
  proxy.binding = undefined;
  render(
    <SceneBindingTooltip
      proxy={proxy}
      clientX={0}
      clientY={0}
      onDismiss={() => {}}
    />
  );
  expect(screen.queryByRole('tooltip')).toBeNull();
});

it('places a fixed trigger at the client coordinates', () => {
  const { container } = render(
    <SceneBindingTooltip
      proxy={makeProxy()}
      clientX={40}
      clientY={60}
      onDismiss={() => {}}
    />
  );
  expect(container.querySelector('span')).toHaveStyle({
    position: 'fixed',
    left: '40px',
    top: '60px',
  });
});
