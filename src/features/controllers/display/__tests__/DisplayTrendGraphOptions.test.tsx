import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import {
  DisplayTrendGraphModel,
  DisplayStateGraphModel,
  DisplayAlarmGraphModel,
} from '@/karabo/common/api';
import { Timestamp } from '@/karabo/data/api';
import {
  BaseBinding,
  DeviceProxy,
  PropertyProxy,
  ProxyStatus,
} from '@/lib/binding/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import DisplayTrendGraph from '../DisplayTrendGraph';

const originalRequest = window.requestIdleCallback;
const originalCancel = window.cancelIdleCallback;
const chart = () =>
  (Chart as unknown as { instances: Chart<'line'>[] }).instances.at(-1)!;
const flush = () => act(() => jest.runOnlyPendingTimers());

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(1000_000);
  window.requestIdleCallback = jest.fn((callback: IdleRequestCallback) =>
    window.setTimeout(
      () => callback({ didTimeout: false, timeRemaining: () => 50 }),
      0
    )
  );
  window.cancelIdleCallback = jest.fn((id) => window.clearTimeout(id));
});
afterEach(() => {
  cleanup();
  window.requestIdleCallback = originalRequest;
  window.cancelIdleCallback = originalCancel;
  jest.useRealTimers();
});

test.each([
  [DisplayTrendGraphModel, 1, 2],
  [DisplayStateGraphModel, 'NORMAL', 'ERROR'],
  [DisplayAlarmGraphModel, 'none', 'alarm'],
] as const)(
  '%p retains saved styles and property visibility on updates and recreation',
  (Model, initial, next) => {
    const model = new Model();
    model.keys = ['DEV.a', 'DEV.b'];
    model.curve_options = [
      { key: 'DEV.a', name: 'Saved', pen_color: '#123456', curve_type: 2 },
      { key: 'DEV.b', name: 'Saved', pen_color: '', curve_type: 2 },
    ];
    const root = new DeviceProxy('DEV');
    root.status = ProxyStatus.MONITORING;
    const a = new BaseBinding();
    const b = new BaseBinding();
    a.setValue(initial, new Timestamp(1000));
    b.setValue(initial, new Timestamp(1000));
    root.binding.value!.set('a', a);
    root.binding.value!.set('b', b);
    const proxies = [
      new PropertyProxy(root, 'a'),
      new PropertyProxy(root, 'b'),
    ];
    const ctx = () => ({ proxies: [...proxies] }) as ControllerContainerContext;
    const view = render(<DisplayTrendGraph model={model} ctx={ctx()} />);
    flush();
    const first = chart();
    expect(first.data.datasets).toMatchObject([
      { label: 'Saved', borderColor: '#123456', backgroundColor: '#123456' },
      { label: 'Saved', borderColor: '#ff3333', backgroundColor: '#ff3333' },
    ]);
    const buttons = screen.getAllByRole('button', { name: 'Saved' });
    expect(buttons[0].firstElementChild).toHaveStyle({
      backgroundColor: '#123456',
    });
    expect(buttons[1].firstElementChild).toHaveStyle({
      backgroundColor: '#ff3333',
    });
    fireEvent.click(buttons[0]);
    expect(first.isDatasetVisible(0)).toBe(false);
    a.setValue(next, new Timestamp(1001));
    view.rerender(<DisplayTrendGraph model={model} ctx={ctx()} />);
    flush();
    expect(chart()).toBe(first);
    expect(first.data.datasets[0]).toMatchObject({
      label: 'Saved',
      borderColor: '#123456',
    });
    expect(first.data.datasets[0].data).toHaveLength(2);
    expect(first.isDatasetVisible(0)).toBe(false);

    const reordered = new Model();
    reordered.keys = ['DEV.b', 'DEV.a'];
    reordered.curve_options = model.curve_options;
    proxies.reverse();
    view.rerender(<DisplayTrendGraph model={reordered} ctx={ctx()} />);
    flush();
    expect(chart()).not.toBe(first);
    expect(chart().data.datasets).toMatchObject([
      { label: 'Saved', borderColor: '#3399ff' },
      { label: 'Saved', borderColor: '#123456' },
    ]);
    expect(chart().isDatasetVisible(1)).toBe(false);
    expect(screen.getAllByRole('button', { name: 'Saved' })[1]).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  }
);
