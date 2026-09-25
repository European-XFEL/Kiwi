import { Button } from '@/components/api';
import { fireEvent, render, screen } from '@testing-library/react';
import { AccessLevel } from '@/karabo/data/api';
import { DisplayTrendGraphModel } from '@/karabo/common/api';
import * as trendData from '../../../hooks/useDisplayTrendGraph';
import * as trendView from '../../../hooks/useTrendGraphView';
import DisplayTrendGraph from '../DisplayTrendGraph';

jest.mock('echarts/core', () => {
  type AxisOption = {
    min?: number;
    max?: number;
    inverse?: boolean;
    type?: string;
  };
  type SeriesOption = { data: number[][] };
  type MockOption = {
    series: SeriesOption[];
    xAxis: AxisOption;
    yAxis: AxisOption;
    grid?: Record<string, unknown>;
  };
  class Chart {
    static instances: Chart[] = [];
    option: MockOption = { series: [], xAxis: {}, yAxis: {} };
    setOption = jest.fn((next: Partial<MockOption>) => {
      this.option = {
        ...this.option,
        ...next,
        xAxis: { ...this.option.xAxis, ...next.xAxis },
        yAxis: { ...this.option.yAxis, ...next.yAxis },
      };
    });
    width = 100;
    height = 100;
    resize = jest.fn(({ width, height }: { width: number; height: number }) => {
      this.width = width;
      this.height = height;
    });
    dispose = jest.fn();
    getWidth = () => this.width;
    getHeight = () => this.height;

    constructor(public element: HTMLElement) {
      Chart.instances.push(this);
    }

    private ranges() {
      const points = this.option.series.flatMap((item) => item.data);
      const values = (index: number) =>
        points.map((point: number[]) => point[index]);
      const range = (
        axis: AxisOption,
        data: number[],
        fallback: [number, number]
      ) => {
        if (axis?.min != null && axis?.max != null) {
          return [axis.min, axis.max] as [number, number];
        }
        if (!data.length) return fallback;
        const min = Math.min(...data);
        const max = Math.max(...data);
        return min === max ? [min / 2, min * 2 || 1] : [min, max];
      };
      return {
        x: range(this.option.xAxis, values(0), [0, 1]),
        y: range(this.option.yAxis, values(1), [0, 1]),
      };
    }

    convertToPixel = (_finder: unknown, value: number[]) => {
      const { x, y } = this.ranges();
      const xRatio = (value[0] - x[0]) / (x[1] - x[0]);
      const yRatio = (value[1] - y[0]) / (y[1] - y[0]);
      const top = Number(this.option.grid?.top);
      return [
        this.option.xAxis?.inverse ? 98 - xRatio * 46 : 52 + xRatio * 46,
        this.option.yAxis?.inverse
          ? top + yRatio * (66 - top)
          : 66 - yRatio * (66 - top),
      ];
    };

    convertFromPixel = (_finder: unknown, value: number[]) => {
      const { x, y } = this.ranges();
      const xRatio = this.option.xAxis?.inverse
        ? (98 - value[0]) / 46
        : (value[0] - 52) / 46;
      const top = Number(this.option.grid?.top);
      const yRatio = this.option.yAxis?.inverse
        ? (value[1] - top) / (66 - top)
        : (66 - value[1]) / (66 - top);
      return [x[0] + xRatio * (x[1] - x[0]), y[0] + yRatio * (y[1] - y[0])];
    };
  }
  return {
    init: jest.fn((element: HTMLElement) => new Chart(element)),
    use: jest.fn(),
    __Chart: Chart,
  };
});

jest.mock('echarts/charts', () => ({ LineChart: class LineChart {} }));
jest.mock('echarts/components', () => ({
  GridComponent: class GridComponent {},
  LegendComponent: class LegendComponent {},
  TitleComponent: class TitleComponent {},
}));
jest.mock('echarts/renderers', () => ({
  CanvasRenderer: class CanvasRenderer {},
}));

jest.mock('@/components/api', () => {
  const React = jest.requireActual('react');
  const actual = jest.requireActual('@/components/api');
  return {
    ...actual,
    Button: jest.fn((props) => React.createElement(actual.Button, props)),
  };
});

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  callback: ResizeObserverCallback;
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }
}

const ctx = {
  proxies: [],
  proxy: undefined,
  userAccessLevel: AccessLevel.OBSERVER,
};

type MockChart = {
  element: HTMLElement;
  option: {
    series: Array<{ data: number[][] }>;
    xAxis: { min?: number; max?: number; inverse?: boolean };
    yAxis: { min?: number; max?: number; inverse?: boolean; type?: string };
    grid?: Record<string, unknown>;
  };
  setOption: jest.Mock;
  resize: jest.Mock;
  dispose: jest.Mock;
  convertToPixel: (finder: unknown, value: number[]) => number[];
  convertFromPixel: (finder: unknown, value: number[]) => number[];
};

function currentChart() {
  const { __Chart } = jest.requireMock('echarts/core');
  return __Chart.instances.at(-1) as MockChart;
}

function published(startTime = 1000) {
  return {
    startTime,
    series: [{ key: 'A.value', timestamps: [startTime], values: [1] }],
    dataRevision: 1,
  };
}

describe('DisplayTrendGraph', () => {
  beforeEach(() => {
    ResizeObserverMock.instances = [];
    Object.assign(global, { ResizeObserver: ResizeObserverMock });
  });
  afterEach(() => jest.restoreAllMocks());

  it('skips graph rendering during collection and renders a published revision', () => {
    const data = published();
    const collect = jest
      .spyOn(trendData, 'useDisplayTrendGraph')
      .mockReturnValue(data);
    const renderView = jest.spyOn(trendView, 'useTrendGraphView');
    const model = new DisplayTrendGraphModel();
    const { rerender } = render(<DisplayTrendGraph model={model} ctx={ctx} />);
    collect.mockClear();
    renderView.mockClear();

    data.series[0].timestamps.push(2000);
    data.series[0].values.push(2);
    rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
    expect(collect).toHaveBeenCalledTimes(1);
    expect(renderView).not.toHaveBeenCalled();

    data.series = [...data.series];
    data.dataRevision++;
    rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
    expect(renderView).toHaveBeenCalledTimes(1);
    expect(currentChart().option.series[0].data).toEqual([
      [1000, 1],
      [2000, 2],
    ]);
  });

  it('does not rerender toolbar buttons for published samples', () => {
    const data = published();
    jest.spyOn(trendData, 'useDisplayTrendGraph').mockReturnValue(data);
    const model = new DisplayTrendGraphModel();
    const { rerender } = render(<DisplayTrendGraph model={model} ctx={ctx} />);
    const plotArea = { ...currentChart().option.grid };
    jest.mocked(Button).mockClear();

    data.series = [
      { key: 'A.value', timestamps: [1000, 2000], values: [1, 1e20] },
    ];
    data.dataRevision++;
    rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
    expect(Button).not.toHaveBeenCalled();
    expect(currentChart().option.grid).toEqual(plotArea);
  });

  it('initializes one canvas chart, resizes it, and disposes it', () => {
    const { init } = jest.requireMock('echarts/core');
    const { unmount } = render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    const chart = currentChart();
    expect(init).toHaveBeenCalledWith(
      screen.getByTestId('trend-chart'),
      undefined,
      {
        renderer: 'canvas',
        useDirtyRect: true,
      }
    );
    expect(ResizeObserverMock.instances[0].observe).toHaveBeenCalledWith(
      screen.getByTestId('trend-chart')
    );

    Object.defineProperties(chart.element, {
      clientWidth: { value: 200 },
      clientHeight: { value: 150 },
    });
    ResizeObserverMock.instances[0].callback(
      [],
      ResizeObserverMock.instances[0]
    );
    expect(chart.resize).toHaveBeenCalledWith({
      width: 200,
      height: 150,
      silent: true,
    });
    ResizeObserverMock.instances[0].callback(
      [],
      ResizeObserverMock.instances[0]
    );
    expect(chart.resize).toHaveBeenCalledTimes(1);
    unmount();
    expect(ResizeObserverMock.instances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(chart.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps the configured background around a white framed plot', () => {
    const model = new DisplayTrendGraphModel();
    model.background = '#123456';
    render(<DisplayTrendGraph model={model} ctx={ctx} />);

    expect(
      screen.getByRole('toolbar').parentElement?.parentElement
    ).toHaveStyle({
      backgroundColor: '#123456',
    });
    expect(currentChart().option.grid).toMatchObject({
      backgroundColor: '#fff',
      borderColor: '#000',
      borderWidth: 1,
    });
  });

  it('reserves top space only while a title is present', () => {
    const model = new DisplayTrendGraphModel();
    const { rerender } = render(<DisplayTrendGraph model={model} ctx={ctx} />);
    expect(currentChart().option.grid?.top).toBe(2);

    const titled = new DisplayTrendGraphModel();
    titled.title = 'Temperatures';
    rerender(<DisplayTrendGraph model={titled} ctx={ctx} />);
    expect(currentChart().option.grid?.top).toBe(18);

    rerender(<DisplayTrendGraph model={model} ctx={ctx} />);
    expect(currentChart().option.grid?.top).toBe(2);
  });

  it('zooms with a clamped mouse rectangle and completes outside the chart', () => {
    jest.spyOn(trendData, 'useDisplayTrendGraph').mockReturnValue(published());
    render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    const container = screen.getByTestId('trend-chart');
    const selection = screen.getByTestId('trend-zoom-selection');
    const plotArea = { ...currentChart().option.grid };
    fireEvent.click(screen.getByRole('button', { name: 'Zoom' }));

    fireEvent.mouseDown(container, { button: 0, clientX: 60, clientY: 30 });
    fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });
    expect(selection).toHaveStyle({
      display: 'block',
      left: '60px',
      top: '30px',
      width: '38px',
      height: '36px',
    });
    fireEvent.mouseUp(document, { button: 0, clientX: 200, clientY: 200 });

    expect(selection).toHaveStyle({ display: 'none' });
    expect(currentChart().option.xAxis.min).toBeGreaterThan(1000);
    expect(currentChart().option.xAxis.max).toBe(2000);
    expect(currentChart().option.grid).toEqual(plotArea);
    expect(screen.getByRole('button', { name: 'Uptime' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('pans both axes during movement and restores the view on cancellation', () => {
    jest.spyOn(trendData, 'useDisplayTrendGraph').mockReturnValue(published());
    render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    const chart = currentChart();
    const container = screen.getByTestId('trend-chart');
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    const lower = chart.convertFromPixel({}, [52, 66]);
    const upper = chart.convertFromPixel({}, [98, 2]);
    const original = {
      x: [lower[0], upper[0]],
      y: [lower[1], upper[1]],
    };

    fireEvent.mouseDown(container, { button: 0, clientX: 60, clientY: 30 });
    fireEvent.mouseMove(document, { clientX: 70, clientY: 40 });
    expect(chart.option.xAxis.min).not.toBe(original.x[0]);
    expect(chart.option.yAxis.min).not.toBe(original.y[0]);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(chart.option.xAxis.min).toBe(original.x[0]);
    expect(chart.option.xAxis.max).toBe(original.x[1]);
    expect(chart.option.yAxis.min).toBe(original.y[0]);
    expect(chart.option.yAxis.max).toBe(original.y[1]);
    expect(screen.getByRole('button', { name: 'Uptime' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('pans with the middle mouse button when Pointer is selected', () => {
    jest.spyOn(trendData, 'useDisplayTrendGraph').mockReturnValue(published());
    render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    const chart = currentChart();
    const container = screen.getByTestId('trend-chart');
    const before = { ...chart.option.xAxis };

    fireEvent.mouseDown(container, { button: 1, clientX: 60, clientY: 30 });
    fireEvent.mouseMove(document, { clientX: 70, clientY: 40 });
    fireEvent.mouseUp(document, { button: 1, clientX: 70, clientY: 40 });

    expect(chart.option.xAxis.min).not.toBe(before.min);
    expect(chart.option.xAxis.max).not.toBe(before.max);
  });

  it('resets the view with a middle mouse click', () => {
    render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    const container = screen.getByTestId('trend-chart');
    const tenMinutes = screen.getByRole('button', { name: 'Ten Minutes' });

    fireEvent.click(tenMinutes);
    expect(tenMinutes).toHaveAttribute('aria-pressed', 'true');
    fireEvent.mouseDown(container, { button: 1, clientX: 60, clientY: 30 });
    fireEvent.mouseUp(container, { button: 1, clientX: 60, clientY: 30 });

    expect(screen.getByRole('button', { name: 'Uptime' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('zooms in to the left and out to the right with the right mouse button', () => {
    jest.spyOn(trendData, 'useDisplayTrendGraph').mockReturnValue(published());
    render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    const chart = currentChart();
    const container = screen.getByTestId('trend-chart');

    const first = chart.convertFromPixel({}, [52, 66]);
    const second = chart.convertFromPixel({}, [98, 2]);
    const clicked = chart.convertFromPixel({}, [75, 30]);
    const initialSpan = second[0] - first[0];

    fireEvent.mouseDown(container, { button: 2, clientX: 75, clientY: 30 });
    fireEvent.mouseMove(document, { clientX: 25, clientY: 30 });
    fireEvent.mouseUp(document, { button: 2, clientX: 25, clientY: 30 });
    const zoomedInSpan =
      (chart.option.xAxis.max ?? 0) - (chart.option.xAxis.min ?? 0);
    expect(zoomedInSpan).toBeLessThan(initialSpan);
    expect(
      ((chart.option.xAxis.max ?? 0) + (chart.option.xAxis.min ?? 0)) / 2
    ).toBeCloseTo(clicked[0]);
    expect(
      ((chart.option.yAxis.max ?? 0) + (chart.option.yAxis.min ?? 0)) / 2
    ).toBeCloseTo(clicked[1]);

    fireEvent.mouseDown(container, { button: 2, clientX: 75, clientY: 30 });
    fireEvent.mouseMove(document, { clientX: 175, clientY: 30 });
    fireEvent.mouseUp(document, { button: 2, clientX: 175, clientY: 30 });
    const zoomedOutSpan =
      (chart.option.xAxis.max ?? 0) - (chart.option.xAxis.min ?? 0);
    expect(zoomedOutSpan).toBeGreaterThan(zoomedInSpan);
    expect(fireEvent.contextMenu(container)).toBe(false);
  });

  it('ignores pointer events', () => {
    jest.spyOn(trendData, 'useDisplayTrendGraph').mockReturnValue(published());
    render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    const chart = currentChart();
    const container = screen.getByTestId('trend-chart');
    chart.setOption.mockClear();
    fireEvent.pointerDown(container, { pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(container, { pointerId: 1, pointerType: 'touch' });
    expect(chart.setOption).not.toHaveBeenCalled();
  });

  it.each(['release', 'cancel'])(
    'defers live data during a gesture and applies the latest revision on %s',
    (outcome) => {
      const data = published();
      jest.spyOn(trendData, 'useDisplayTrendGraph').mockReturnValue(data);
      const model = new DisplayTrendGraphModel();
      const { rerender } = render(
        <DisplayTrendGraph model={model} ctx={ctx} />
      );
      const chart = currentChart();
      const container = screen.getByTestId('trend-chart');
      fireEvent.click(screen.getByRole('button', { name: 'Move' }));
      fireEvent.mouseDown(container, { button: 0, clientX: 60, clientY: 30 });
      fireEvent.mouseMove(document, { clientX: 70, clientY: 40 });
      chart.setOption.mockClear();

      data.series = [
        { key: 'A.value', timestamps: [1000, 2000], values: [1, 2] },
      ];
      data.dataRevision++;
      rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
      expect(chart.setOption).not.toHaveBeenCalled();

      data.series = [
        { key: 'A.value', timestamps: [1000, 2000, 3000], values: [1, 2, 3] },
      ];
      data.dataRevision++;
      rerender(<DisplayTrendGraph model={model} ctx={{ ...ctx }} />);
      expect(chart.setOption).not.toHaveBeenCalled();

      if (outcome === 'release') {
        fireEvent.mouseUp(document, { button: 0, clientX: 70, clientY: 40 });
      } else {
        fireEvent.keyDown(document, { key: 'Escape' });
      }
      expect(chart.option.series[0].data).toHaveLength(3);
      expect(screen.getByRole('button', { name: 'Uptime' })).toHaveAttribute(
        'aria-pressed',
        outcome === 'cancel' ? 'true' : 'false'
      );
    }
  );

  it('keeps inverted logarithmic axes valid through pan and reset', () => {
    const model = new DisplayTrendGraphModel();
    model.x_invert = true;
    model.y_invert = true;
    model.y_log = true;
    jest.spyOn(trendData, 'useDisplayTrendGraph').mockReturnValue(published());
    render(<DisplayTrendGraph model={model} ctx={ctx} />);
    const chart = currentChart();
    const container = screen.getByTestId('trend-chart');
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    fireEvent.mouseDown(container, { button: 0, clientX: 60, clientY: 30 });
    fireEvent.mouseMove(document, { clientX: 70, clientY: 40 });
    fireEvent.mouseUp(document, { button: 0, clientX: 70, clientY: 40 });
    expect(chart.option.xAxis.inverse).toBe(true);
    expect(chart.option.yAxis.inverse).toBe(true);
    expect(chart.option.yAxis.type).toBe('log');
    expect(chart.option.yAxis.min).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(chart.option.xAxis.inverse).toBe(true);
    expect(chart.option.yAxis.inverse).toBe(true);
  });

  it('preserves time presets and reset states', () => {
    render(
      <DisplayTrendGraph model={new DisplayTrendGraphModel()} ctx={ctx} />
    );
    const uptime = screen.getByRole('button', { name: 'Uptime' });
    const tenMinutes = screen.getByRole('button', { name: 'Ten Minutes' });
    const plotArea = { ...currentChart().option.grid };

    expect(uptime).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(tenMinutes);
    expect(tenMinutes).toHaveAttribute('aria-pressed', 'true');
    expect(currentChart().option.grid).toEqual(plotArea);
    expect(currentChart().setOption).toHaveBeenLastCalledWith(
      expect.objectContaining({ grid: plotArea }),
      { replaceMerge: ['series'] }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(uptime).toHaveAttribute('aria-pressed', 'true');
    expect(currentChart().option.xAxis.min).toBeLessThanOrEqual(
      currentChart().option.xAxis.max ?? 0
    );
    expect(currentChart().option.grid).toEqual(plotArea);
    // Reset must still apply when already following uptime, without a revision counter.
    currentChart().setOption.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(currentChart().setOption).toHaveBeenCalledWith(
      expect.objectContaining({
        yAxis: expect.objectContaining({ min: null, max: null }),
      }),
      { replaceMerge: ['series'] }
    );
  });
});
