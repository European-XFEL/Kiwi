import { act, cleanup, render, renderHook } from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import {
  Hash,
  HashAttributes,
  HashType,
  Schema,
  Timestamp,
} from '@/karabo/data/api';
import { VectorCharValue } from '@/karabo/data/types';
import { NDArrayGraphModel } from '@/karabo/common/api';
import {
  applyConfiguration,
  DeviceProxy,
  NDArrayBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import DisplayVectorGraph from '../../display/DisplayVectorGraph';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { useVectorSeries } from '../useVectorSeries';

function setup() {
  const array = new Hash();
  for (const [name, valueType] of [
    ['data', 'BYTE_ARRAY'],
    ['type', 'INT32'],
    ['shape', 'VECTOR_UINT64'],
  ]) {
    array.setElement(
      name,
      new Hash(),
      new HashAttributes({ nodeType: 0, valueType })
    );
  }
  const hash = new Hash();
  hash.setElement(
    'array',
    array,
    new HashAttributes({ nodeType: 1, displayType: 'NDArray' })
  );
  const schema = new Schema('Arrays', hash);
  const root = new DeviceProxy('DEV');
  root.handleDeviceSchema(schema);
  const proxy = new PropertyProxy(root, 'array');
  function configure(samples: ArrayBufferView, type = HashType.Int16) {
    applyConfiguration(
      new Hash(
        'array.data',
        new VectorCharValue(
          new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)
        ),
        'array.type',
        type
      ),
      root.binding,
      new Timestamp()
    );
  }
  return { root, proxy, schema, configure };
}

const originalRequest = window.requestIdleCallback;
const originalCancel = window.cancelIdleCallback;
function flushIdle() {
  act(() => jest.runOnlyPendingTimers());
}

beforeEach(() => {
  jest.useFakeTimers();
  window.requestIdleCallback = jest.fn((callback: IdleRequestCallback) =>
    window.setTimeout(
      () => callback({ didTimeout: false, timeRemaining: () => 50 }),
      0
    )
  );
  window.cancelIdleCallback = jest.fn((id: number) => window.clearTimeout(id));
});

afterEach(() => {
  cleanup();
  window.requestIdleCallback = originalRequest;
  window.cancelIdleCallback = originalCancel;
  jest.useRealTimers();
});

test.each([
  [HashType.Int16, new Int16Array([-7, 12])],
  [HashType.Float, new Float32Array([-1.25, 0.5])],
  [HashType.Double, new Float64Array([-1.25, Math.PI])],
  [HashType.Bool, new Uint8Array([0, 1])],
  [HashType.Int64, new BigInt64Array([-7n, 12n])],
  [HashType.UInt64, new BigUint64Array([7n, 12n])],
])('publishes decoded NDArray type %s at idle', (type, samples) => {
  const { proxy, configure } = setup();
  expect(proxy.binding).toBeInstanceOf(NDArrayBinding);
  configure(samples, type);
  const { result } = renderHook(() =>
    useVectorSeries({ proxies: [proxy], keys: ['DEV.array'] })
  );
  expect(result.current[0].values.length).toBe(0);
  flushIdle();
  const big =
    samples instanceof BigInt64Array || samples instanceof BigUint64Array;
  expect(result.current[0].values).toEqual(
    big ? Float64Array.from(samples, Number) : samples
  );
  if (!big) {
    expect((result.current[0].values as Int16Array).buffer).toBe(
      proxy.binding!.value.get('data').getValue().buffer
    );
  }
});

test('stops scheduling after publishing an unchanged NDArray frame', () => {
  const { proxy, configure } = setup();
  configure(new Int16Array([1, 2]));
  const { result, rerender } = renderHook(() =>
    useVectorSeries({ proxies: [proxy], keys: ['DEV.array'] })
  );
  flushIdle();
  expect(result.current[0].values).toEqual(new Int16Array([1, 2]));
  flushIdle();
  flushIdle();
  expect(jest.getTimerCount()).toBe(0);
  rerender();
  expect(jest.getTimerCount()).toBe(0);
});

test('coalesces frames and detects bytes, type, and timestamp changes in the same namespace', () => {
  const { root, proxy, configure } = setup();
  const namespace = proxy.binding!.value;
  configure(new Int16Array([1, 2]));
  const { result, rerender } = renderHook(() =>
    useVectorSeries({ proxies: [proxy], keys: ['DEV.array'] })
  );
  configure(new Int16Array([3, 4]));
  rerender();
  expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
  flushIdle();
  expect(result.current[0].values).toEqual(new Int16Array([3, 4]));
  expect(proxy.binding!.value).toBe(namespace);
  expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
  rerender();
  expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);

  const data = namespace.get('data');
  const bytes = data.getValue();
  new Int16Array(bytes.buffer, bytes.byteOffset, 2).set([5, 6]);
  applyConfiguration(
    new Hash('array.data', data.value),
    root.binding,
    new Timestamp()
  );
  rerender();
  expect(window.requestIdleCallback).toHaveBeenCalledTimes(2);
  flushIdle();
  expect(result.current[0].values).toEqual(new Int16Array([5, 6]));

  applyConfiguration(
    new Hash('array.type', HashType.UInt8),
    root.binding,
    new Timestamp()
  );
  rerender();
  flushIdle();
  expect(result.current[0].values).toEqual(bytes);
});

test('pending publication uses the replacement proxy and schema', () => {
  const first = setup();
  first.configure(new Int16Array([1]));
  const { result, rerender } = renderHook(
    ({ proxy }) => useVectorSeries({ proxies: [proxy], keys: ['DEV.array'] }),
    {
      initialProps: { proxy: first.proxy },
    }
  );
  const second = setup();
  second.configure(new Int16Array([2]));
  rerender({ proxy: second.proxy });
  const oldBinding = second.proxy.binding;
  second.root.handleDeviceSchema(second.schema);
  second.configure(new Int16Array([3]));
  rerender({ proxy: second.proxy });
  expect(second.proxy.binding).not.toBe(oldBinding);
  expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
  flushIdle();
  expect(result.current[0].values).toEqual(new Int16Array([3]));
});

test('clears missing, empty, and unsupported arrays including a pending frame', () => {
  const { root, proxy, schema, configure } = setup();
  const { result, rerender } = renderHook(() =>
    useVectorSeries({ proxies: [proxy], keys: ['DEV.array'] })
  );
  expect(result.current[0].values.length).toBe(0);
  for (const type of [HashType.Int16, HashType.String]) {
    configure(new Int16Array([1]));
    rerender();
    flushIdle();
    expect(result.current[0].values.length).toBe(1);
    configure(new Int16Array(), type);
    rerender();
    flushIdle();
    expect(result.current[0].values.length).toBe(0);
  }
  configure(new Int16Array([2]), HashType.String);
  rerender();
  flushIdle();
  expect(result.current[0].values.length).toBe(0);
  configure(new Int16Array([3]));
  rerender();
  root.handleDeviceSchema(schema);
  rerender();
  flushIdle();
  expect(result.current[0].values.length).toBe(0);
});

test('renderer transforms decoded samples, reuses the chart, and clears stale points', () => {
  const { proxy, configure } = setup();
  configure(new Int16Array([1, 2, 3]));
  const model = new NDArrayGraphModel();
  model.offset = 10;
  model.step = 0.5;
  model.keys = ['DEV.array'];
  const ctx = { proxy, proxies: [proxy] } as ControllerContainerContext;
  const view = render(<DisplayVectorGraph model={model} ctx={ctx} />);
  flushIdle();
  const charts = (Chart as unknown as { instances: Chart<'line'>[] }).instances;
  const chart = charts.at(-1)!;
  expect(chart.data.datasets[0].data).toEqual([
    { x: 10, y: 1 },
    { x: 10.5, y: 2 },
    { x: 11, y: 3 },
  ]);
  configure(new Float32Array([4, 5]), HashType.Float);
  view.rerender(<DisplayVectorGraph model={model} ctx={ctx} />);
  flushIdle();
  expect(charts.at(-1)).toBe(chart);
  expect(chart.data.datasets[0].data).toEqual([
    { x: 10, y: 4 },
    { x: 10.5, y: 5 },
  ]);
  configure(new Int16Array());
  view.rerender(<DisplayVectorGraph model={model} ctx={ctx} />);
  flushIdle();
  expect(chart.data.datasets[0].data).toEqual([]);
});
