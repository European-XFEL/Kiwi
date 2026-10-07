import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import type { ScriptableContext } from 'chart.js';
import { DisplayVectorGraphModel } from '@/karabo/common/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { PropertyProxy } from '@/lib/binding/api';
import { makeVectorProxy } from '../../graph/testing/vectorProxy';
import { TRACE_COLORS } from '../../graph/common/api';
import DisplayVectorGraph from '../DisplayVectorGraph';

const context = (proxies: (PropertyProxy | undefined)[]) =>
  ({ proxies }) as ControllerContainerContext;
type MockChart = Chart<'line'> & { destroy: jest.Mock };
const charts = () => (Chart as unknown as { instances: MockChart[] }).instances;
const chart = () => charts().at(-1)!;
const originalRequest = window.requestIdleCallback;
const originalCancel = window.cancelIdleCallback;
const flush = () => act(() => jest.runOnlyPendingTimers());

beforeEach(() => {
  charts().length = 0;
  jest.useFakeTimers();
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

test.each([-2, 0, 2])(
  'plots independent lengths and empty slots with step %s',
  (step) => {
    const model = new DisplayVectorGraphModel();
    Object.assign(model, {
      keys: ['DEV.a', 'DEV.missing', 'DEV.b'],
      offset: 10,
      step,
    });
    const a = makeVectorProxy([1, 2, 3]);
    const b = makeVectorProxy([4]);
    const ctx = context([a, undefined, b]);
    const view = render(<DisplayVectorGraph model={model} ctx={ctx} />);
    flush();
    const first = chart();
    expect(first.data.datasets.map((item) => item.data)).toEqual([
      [1, 2, 3].map((y, index) => ({ x: 10 + index * (step || 1), y })),
      [],
      [{ x: 10, y: 4 }],
    ]);
    expect(first.data.datasets.map((item) => item.label)).toEqual(model.keys);
    expect(first.data.datasets.map((item) => item.borderColor)).toEqual(
      TRACE_COLORS.slice(0, 3)
    );
    a.binding!.setValue([], undefined);
    b.binding!.setValue([5, 6], undefined);
    view.rerender(<DisplayVectorGraph model={model} ctx={ctx} />);
    flush();
    expect(chart()).toBe(first);
    expect(first.data.datasets.map((item) => item.data.length)).toEqual([
      0, 0, 2,
    ]);
  }
);

test('preserves visibility across updates, reorder, configuration and reset', () => {
  const model = new DisplayVectorGraphModel();
  model.keys = ['a', 'b'];
  const a = makeVectorProxy([1]);
  const b = makeVectorProxy([2]);
  const view = render(
    <DisplayVectorGraph model={model} ctx={context([a, b])} />
  );
  flush();
  fireEvent.click(screen.getByRole('button', { name: 'b' }));
  const first = chart();
  expect(first.isDatasetVisible(1)).toBe(false);
  a.binding!.setValue([3], undefined);
  view.rerender(<DisplayVectorGraph model={model} ctx={context([a, b])} />);
  flush();
  expect(chart()).toBe(first);
  expect(chart().isDatasetVisible(1)).toBe(false);
  model.keys = ['b', 'a'];
  view.rerender(<DisplayVectorGraph model={model} ctx={context([b, a])} />);
  expect(first.destroy).toHaveBeenCalled();
  expect(chart().isDatasetVisible(0)).toBe(false);
  flush();
  const replacement = new DisplayVectorGraphModel();
  Object.assign(replacement, {
    keys: model.keys,
    title: 'Changed',
    y_label: 'Value',
  });
  view.rerender(
    <DisplayVectorGraph model={replacement} ctx={context([b, a])} />
  );
  expect(chart().isDatasetVisible(0)).toBe(false);
  expect(screen.getByLabelText('Graph legend').parentElement).toHaveStyle({
    left: '88px',
    top: '26px',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
  expect(chart().isDatasetVisible(0)).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'b' }));
  expect(chart().isDatasetVisible(0)).toBe(true);
});

test('samples each curve independently and selects marker sizes from sampled lengths', () => {
  const model = new DisplayVectorGraphModel();
  Object.assign(model, {
    keys: ['small', 'large'],
    x_autorange: false,
    x_min: 50,
    x_max: 100,
  });
  const ctx = context([
    makeVectorProxy([1, 2]),
    makeVectorProxy(new Float64Array(1000).fill(3)),
  ]);
  render(<DisplayVectorGraph model={model} ctx={ctx} />);
  flush();
  expect(chart().data.datasets.map((item) => item.data.length)).toEqual([
    2, 151,
  ]);
  expect(chart().data.datasets[1].data.at(-1)).toEqual({ x: 150, y: 3 });
  for (const dataset of chart().data.datasets) {
    const radius = dataset.pointRadius as (
      ctx: ScriptableContext<'line'>
    ) => number;
    expect(radius({ dataset } as ScriptableContext<'line'>)).toBe(2);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
});

test('defers all vector publications until the active gesture ends', () => {
  const model = new DisplayVectorGraphModel();
  model.keys = ['a', 'b'];
  const a = makeVectorProxy([1, 2]);
  const b = makeVectorProxy([3]);
  const ctx = context([a, b]);
  const view = render(<DisplayVectorGraph model={model} ctx={ctx} />);
  flush();
  const container = screen.getByTestId('vector-chart');
  fireEvent.mouseDown(container, { button: 2, clientX: 90, clientY: 40 });
  a.binding!.setValue([4], undefined);
  b.binding!.setValue([5, 6], undefined);
  view.rerender(<DisplayVectorGraph model={model} ctx={ctx} />);
  flush();
  expect(chart().data.datasets.map((item) => item.data.length)).toEqual([2, 1]);
  fireEvent.mouseUp(document, { button: 2, clientX: 90, clientY: 40 });
  expect(chart().data.datasets.map((item) => item.data.length)).toEqual([1, 2]);
});
