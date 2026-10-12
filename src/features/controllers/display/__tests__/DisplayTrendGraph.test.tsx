import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import { AccessLevel, Timestamp } from '@/karabo/data/api';
import { DeviceProxy, DoubleBinding, PropertyProxy } from '@/lib/binding/api';
import {
  DisplayTrendGraphModel,
  DisplayStateGraphModel,
  DisplayAlarmGraphModel,
} from '@/karabo/common/api';
import * as trendData from '../../graph/trend/api';
import { useTrendModel } from '../../graph/trend/useTrendModel';
import DisplayTrendGraph from '../DisplayTrendGraph';

jest.mock('../../graph/trend/api', () => ({
  ...jest.requireActual('../../graph/trend/api'),
  useTrendModel: jest.fn(),
  useTrendChart: jest.fn(
    jest.requireActual('../../graph/trend/api').useTrendChart
  ),
}));

const ctx = {
  proxies: [],
  proxy: undefined,
  userAccessLevel: AccessLevel.OBSERVER,
};
const published = () => ({
  requestHistory: jest.fn(),
  resetHistory: jest.fn(),
  startTime: 1000,
  series: [{ key: 'A.value', timestamps: [1000, 2000], values: [1, 2] }],
  dataRevision: 1,
});
type MockChart = Chart<'line'> & { update: jest.Mock; destroy: jest.Mock };
const charts = () => (Chart as unknown as { instances: MockChart[] }).instances;
const chart = () => charts().at(-1)!;

describe('DisplayTrendGraph with Chart.js', () => {
  beforeEach(() => {
    charts().length = 0;
  });
  afterEach(() => jest.mocked(trendData.useTrendModel).mockReset());

  it.each([
    [DisplayStateGraphModel, 'state'],
    [DisplayAlarmGraphModel, 'alarm'],
  ] as const)(
    'selects categorical mode for %p and preserves navigation and curve visibility',
    (Model, mode) => {
      const data = published();
      data.series.push({
        key: 'B.value',
        timestamps: [1000, 2000],
        values: [0, 3],
      });
      jest.mocked(trendData.useTrendModel).mockReturnValue(data);
      const model = new Model();
      model.y_log = true;
      model.y_invert = true;
      const { rerender } = render(
        <DisplayTrendGraph model={model} ctx={ctx} />
      );
      expect(trendData.useTrendModel).toHaveBeenCalledWith(
        ctx.proxies,
        model.keys,
        mode
      );
      expect(chart().options.scales?.y).toMatchObject({
        type: 'linear',
        reverse: true,
      });
      const second = screen.getByRole('button', { name: 'B.value' });
      fireEvent.click(second);
      fireEvent.click(screen.getByRole('button', { name: 'Zoom' }));
      const container = screen.getByTestId('trend-chart');
      fireEvent.mouseDown(container, { button: 0, clientX: 70, clientY: 20 });
      fireEvent.mouseUp(document, { button: 0, clientX: 150, clientY: 100 });
      const range = { ...chart().scales.x };
      data.series[0] = {
        key: 'A.value',
        timestamps: [1000, 2000, 3000],
        values: [1, 2, 3],
      };
      data.dataRevision++;
      rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
      expect(chart().scales.x).toEqual(range);
      expect(chart().isDatasetVisible(1)).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: 'Reset View' }));
      expect(chart().scales.x).toEqual({ min: 1000, max: 3000 });
    }
  );

  it('renders controls, data and background, then disposes the chart', () => {
    jest.mocked(trendData.useTrendModel).mockReturnValue(published());
    const model = new DisplayTrendGraphModel();
    model.title = 'Temperatures';
    model.background = '#123456';
    const { unmount } = render(<DisplayTrendGraph model={model} ctx={ctx} />);
    expect(screen.getByRole('button', { name: 'Zoom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'One Week' })
    ).toBeInTheDocument();
    expect(screen.getByText('Temperatures')).toBeInTheDocument();
    expect(screen.getByTestId('trend-chart')).toHaveClass('relative');
    expect(
      screen.getByTestId('trend-chart').parentElement?.parentElement
        ?.parentElement
    ).toHaveStyle({ backgroundColor: '#123456' });
    expect(chart().data.datasets[0].data).toEqual([
      { x: 1000, y: 1 },
      { x: 2000, y: 2 },
    ]);
    unmount();
    expect(chart().destroy).toHaveBeenCalled();
  });

  it('keeps a clickable legend for multiple curves', () => {
    const data = published();
    data.series.push({
      key: 'B.value',
      timestamps: [1000, 2000],
      values: [3, 4],
    });
    jest.mocked(trendData.useTrendModel).mockReturnValue(data);
    const model = new DisplayTrendGraphModel();
    const { rerender } = render(<DisplayTrendGraph model={model} ctx={ctx} />);
    const second = screen.getByRole('button', { name: 'B.value' });
    expect(second).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(second);
    expect(second).toHaveAttribute('aria-pressed', 'false');
    expect(chart().setDatasetVisibility).toHaveBeenCalledWith(1, false);
    expect(chart().isDatasetVisible(1)).toBe(false);
    expect(chart().data.datasets[1].hidden).toBeUndefined();
    data.series[1] = {
      key: 'B.value',
      timestamps: [1000, 2000, 3000],
      values: [3, 4, 5],
    };
    data.dataRevision++;
    rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
    expect(chart().data.datasets[1].data).toHaveLength(3);
    expect(chart().isDatasetVisible(1)).toBe(false);
    data.series.push({
      key: 'C.value',
      timestamps: [1000],
      values: [6],
    });
    data.dataRevision++;
    rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
    expect(charts()).toHaveLength(2);
    expect(chart().isDatasetVisible(1)).toBe(false);
    data.series = [data.series[1], data.series[0], data.series[2]];
    data.dataRevision++;
    rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
    expect(chart().isDatasetVisible(0)).toBe(false);
    const replacement = new DisplayTrendGraphModel();
    replacement.title = 'Changed';
    replacement.y_label = 'Value';
    rerender(<DisplayTrendGraph model={replacement} ctx={{ ...ctx }} />);
    expect(chart().isDatasetVisible(0)).toBe(false);
    expect(screen.getByLabelText('Graph legend').parentElement).toHaveStyle({
      left: '88px',
      top: '26px',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset View' }));
    expect(chart().isDatasetVisible(0)).toBe(false);
    fireEvent.click(second);
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(chart().setDatasetVisibility).toHaveBeenCalledWith(0, true);
  });

  it('zooms with a bounded rectangle and Reset View restores Uptime', () => {
    jest.mocked(trendData.useTrendModel).mockReturnValue(published());
    render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Zoom' }));
    const container = screen.getByTestId('trend-chart');
    const selection = screen.getByTestId('trend-zoom-selection');
    fireEvent.mouseDown(container, { button: 0, clientX: 70, clientY: 20 });
    fireEvent.mouseMove(document, { clientX: 150, clientY: 100 });
    expect(selection).toHaveStyle({ display: 'block' });
    fireEvent.mouseUp(document, { button: 0, clientX: 150, clientY: 100 });
    expect(selection).toHaveStyle({ display: 'none' });
    expect(chart().scales.x.min).toBeGreaterThan(1000);
    expect(chart().scales.x.max).toBeLessThan(2000);
    fireEvent.click(screen.getByRole('button', { name: 'Reset View' }));
    expect(screen.getByRole('button', { name: 'Uptime' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(chart().scales.x).toEqual({ min: 1000, max: 2000 });
  });

  it('defers live samples during a pan and applies them on release', () => {
    const data = published();
    jest.mocked(trendData.useTrendModel).mockReturnValue(data);
    const model = new DisplayTrendGraphModel();
    const { rerender } = render(<DisplayTrendGraph model={model} ctx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    const container = screen.getByTestId('trend-chart');
    fireEvent.mouseDown(container, { button: 0, clientX: 70, clientY: 20 });
    chart().update.mockClear();
    data.series = [
      { key: 'A.value', timestamps: [1000, 2000, 3000], values: [1, 2, 3] },
    ];
    data.dataRevision++;
    rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
    expect(chart().data.datasets[0].data).toHaveLength(2);
    fireEvent.mouseUp(document, { button: 0, clientX: 80, clientY: 30 });
    expect(chart().data.datasets[0].data).toHaveLength(3);
    expect(chart().update).toHaveBeenCalled();
  });

  it('restores the view when a pan is cancelled', async () => {
    jest.mocked(trendData.useTrendModel).mockReturnValue(published());
    render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    const container = screen.getByTestId('trend-chart');
    const original = { ...chart().scales.x };
    fireEvent.mouseDown(container, { button: 0, clientX: 90, clientY: 40 });
    fireEvent.mouseMove(document, { clientX: 100, clientY: 50 });
    await waitFor(() => expect(chart().scales.x).not.toEqual(original));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(chart().scales.x).toEqual(original);
  });

  it('pans inverted axes with a positive logarithmic Y range', () => {
    jest.mocked(trendData.useTrendModel).mockReturnValue(published());
    const model = new DisplayTrendGraphModel();
    model.x_invert = true;
    model.y_invert = true;
    model.y_log = true;
    render(<DisplayTrendGraph model={model} ctx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    const container = screen.getByTestId('trend-chart');
    fireEvent.mouseDown(container, { button: 0, clientX: 90, clientY: 40 });
    fireEvent.mouseMove(document, { clientX: 100, clientY: 50 });
    fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 50 });
    expect(chart().options.scales).toMatchObject({
      x: { reverse: true },
      y: { reverse: true, type: 'logarithmic' },
    });
    expect(chart().scales.y.min).toBeGreaterThan(0);
  });

  it('supports middle click reset and right drag zoom', () => {
    jest.mocked(trendData.useTrendModel).mockReturnValue(published());
    render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    const container = screen.getByTestId('trend-chart');
    fireEvent.mouseDown(container, { button: 2, clientX: 90, clientY: 40 });
    fireEvent.mouseUp(document, { button: 2, clientX: 70, clientY: 40 });
    expect(chart().scales.x.max - chart().scales.x.min).toBeLessThan(1000);
    fireEvent.mouseDown(container, { button: 1, clientX: 90, clientY: 40 });
    fireEvent.mouseUp(document, { button: 1, clientX: 90, clientY: 40 });
    expect(chart().scales.x).toEqual({ min: 1000, max: 2000 });
  });
});

describe('DisplayTrendGraph live publication', () => {
  const requestIdle = window.requestIdleCallback;
  const cancelIdle = window.cancelIdleCallback;
  beforeEach(() => {
    charts().length = 0;
    jest.useFakeTimers();
    window.requestIdleCallback = (callback) =>
      window.setTimeout(
        () => callback({ didTimeout: false, timeRemaining: () => 50 }),
        0
      );
    window.cancelIdleCallback = (id) => window.clearTimeout(id);
    jest.mocked(trendData.useTrendModel).mockImplementation(useTrendModel);
  });
  afterEach(() => {
    cleanup();
    window.requestIdleCallback = requestIdle;
    window.cancelIdleCallback = cancelIdle;
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.mocked(trendData.useTrendModel).mockReset();
  });

  it('only renders the plot after changed live samples publish at idle', () => {
    const root = new DeviceProxy('A');
    root.binding.value!.set('value', new DoubleBinding());
    const proxy = new PropertyProxy(root, 'value');
    const now = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    proxy.binding!.setValue(1, new Timestamp(now / 1000));
    const model = new DisplayTrendGraphModel();
    model.keys = [proxy.key];
    const plot = jest.mocked(trendData.useTrendChart);
    const { rerender, unmount } = render(
      <DisplayTrendGraph model={model} ctx={{ ...ctx, proxies: [proxy] }} />
    );
    act(() => jest.runOnlyPendingTimers());
    plot.mockClear();

    rerender(
      <DisplayTrendGraph model={model} ctx={{ ...ctx, proxies: [proxy] }} />
    );
    expect(plot).not.toHaveBeenCalled();
    proxy.binding!.setValue(2, new Timestamp((now + 1000) / 1000));
    rerender(
      <DisplayTrendGraph model={model} ctx={{ ...ctx, proxies: [proxy] }} />
    );
    expect(plot).not.toHaveBeenCalled();
    expect(chart().data.datasets[0].data).toHaveLength(1);
    act(() => jest.runOnlyPendingTimers());
    expect(plot).toHaveBeenCalled();
    expect(chart().data.datasets[0].data).toEqual([
      { x: now, y: 1 },
      { x: now + 1000, y: 2 },
    ]);
    unmount();
    proxy.dispose();
  });

  it('reloads hidden curves for presets and Reset', () => {
    const proxies = ['A', 'B'].map((device) => {
      const root = new DeviceProxy(device);
      root.binding.value!.set('value', new DoubleBinding());
      const proxy = new PropertyProxy(root, 'value');
      jest.spyOn(proxy, 'getHistory').mockImplementation(() => {});
      return proxy;
    });
    const model = new DisplayTrendGraphModel();
    model.keys = proxies.map((proxy) => proxy.key);
    const { unmount } = render(
      <DisplayTrendGraph model={model} ctx={{ ...ctx, proxies }} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'B.value' }));
    expect(proxies[1].getHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'One Hour' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    for (const proxy of proxies) {
      expect(proxy.getHistory).toHaveBeenCalledTimes(2);
    }
    unmount();
    proxies.forEach((proxy) => proxy.dispose());
  });
});

it.each([
  DisplayTrendGraphModel,
  DisplayStateGraphModel,
  DisplayAlarmGraphModel,
])(
  'provides separate view reset and history reload actions for %p',
  (Model) => {
    jest.useFakeTimers();
    const data = published();
    data.series[0] = {
      key: 'A.value',
      timestamps: [0, 1000, 2000],
      values: [0, 1, 3],
    };
    data.series.push({ key: 'B.value', timestamps: [0, 2000], values: [1, 2] });
    jest.mocked(trendData.useTrendModel).mockReturnValue(data);
    const model = new Model();
    const view = render(<DisplayTrendGraph model={model} ctx={ctx} />);
    const current = chart();
    fireEvent.click(screen.getByRole('button', { name: 'B.value' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    const container = screen.getByTestId('trend-chart');
    fireEvent.mouseDown(container, { button: 0, clientX: 90, clientY: 40 });
    fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 50 });
    fireEvent.click(screen.getByRole('button', { name: 'Reset View' }));
    expect(current.scales.x).toEqual({ min: 1000, max: 2000 });
    expect(screen.getByRole('button', { name: 'Uptime' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    jest.advanceTimersByTime(1000);
    expect(data.requestHistory).not.toHaveBeenCalled();
    const range = [current.scales.x.min, current.scales.x.max];
    const y = { ...current.scales.y };
    const reset = screen.getByRole('button', { name: 'Reset' });
    expect(reset).toHaveAttribute(
      'title',
      'Clear curves and reload historic data'
    );
    fireEvent.click(reset);
    expect(data.resetHistory).toHaveBeenCalledWith(range);
    data.series = data.series.map(({ key }) => ({
      key,
      timestamps: [],
      values: [],
    }));
    data.dataRevision++;
    view.rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
    expect(current.scales.x).toEqual({ min: range[0], max: range[1] });
    expect(current.scales.y).toEqual(y);
    expect(current.data.datasets[0].data).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Uptime' }));
    expect(screen.getByRole('button', { name: 'Uptime' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    view.unmount();
    jest.useRealTimers();
    jest.mocked(trendData.useTrendModel).mockReset();
  }
);
