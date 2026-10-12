import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import { DisplayTrendGraphModel } from '@/karabo/common/api';
import { STATE_LABELS } from '../../trend/categories';
import {
  buildModelConfig,
  buildPlotAxes,
  commonChartOption,
  integerTickFormatter,
  useChart,
  useChartRanges,
  type PlotAxesConfig,
} from '../api';
import { ZOOM_FACTOR_PER_PIXEL } from '../useMouseGestures';

type Point = { x: number; y: number };
const MIDDLE_MOUSE_BUTTON = 1;
const RIGHT_MOUSE_BUTTON = 2;

const points = [
  { x: 0, y: 0 },
  { x: 1000, y: 1 },
];
const model = buildModelConfig(new DisplayTrendGraphModel());
const timeAxes = buildPlotAxes(model, { timeX: true });
const mappedAxes: PlotAxesConfig = {
  ...timeAxes,
  y: {
    ...timeAxes.y,
    formatTick: integerTickFormatter(
      new Map([
        [0, 'Off'],
        [1, 'On'],
      ])
    ),
  },
};
const chart = () =>
  (Chart as unknown as { instances: Chart<'line'>[] }).instances.at(-1)!;

function Harness({
  axes,
  data = points,
  revision = 0,
  onYAxisWidth,
}: {
  axes: PlotAxesConfig;
  data?: Point[];
  revision?: number;
  onYAxisWidth?: (width: number) => void;
}) {
  const ranges = useChartRanges(axes);
  const buildData = React.useCallback(() => ({ datasets: [{ data }] }), [data]);
  const plot = useChart({
    axes,
    configuration: () => commonChartOption(model, axes, 'line', onYAxisWidth),
    identity: [axes],
    xRange: ranges.xRange,
    yRange: ranges.yRange,
    onComplete: ranges.pause,
    onReset: ranges.reset,
    buildData,
    dataRevision: revision,
  });
  return (
    <>
      <div ref={plot.containerRef} data-testid="plot" />
      <div ref={plot.selectionRef} />
      <output data-testid="y-axis-width">{plot.yAxisWidth}</output>
      <button onClick={() => plot.selectTool('pointer')}>Pointer</button>
      <button onClick={() => plot.selectTool('zoom')}>Zoom</button>
      <button onClick={() => plot.selectTool('pan')}>Move</button>
      <button onClick={plot.reset}>Reset</button>
    </>
  );
}

it.each([
  { axes: timeAxes, minimum: 64, narrowed: 120 },
  {
    axes: { ...timeAxes, y: { ...timeAxes.y, categories: STATE_LABELS } },
    minimum: 30,
    narrowed: 30,
  },
])(
  'publishes fitted Y widths while preserving the axis callback ($minimum)',
  ({ axes, minimum, narrowed }) => {
    const onYAxisWidth = jest.fn();
    render(<Harness axes={axes} onYAxisWidth={onYAxisWidth} />);
    const afterFit = chart().options.scales!.y!.afterFit!;
    const scale = { width: 30 };
    act(() => afterFit(scale as never));
    expect(screen.getByTestId('y-axis-width')).toHaveTextContent(
      String(minimum)
    );
    expect(onYAxisWidth).toHaveBeenLastCalledWith(minimum);
    scale.width = 120;
    act(() => afterFit(scale as never));
    expect(screen.getByTestId('y-axis-width')).toHaveTextContent('120');
    expect(onYAxisWidth).toHaveBeenLastCalledWith(120);
    scale.width = 30;
    act(() => afterFit(scale as never));
    expect(screen.getByTestId('y-axis-width')).toHaveTextContent(
      String(narrowed)
    );
    expect(onYAxisWidth).toHaveBeenLastCalledWith(narrowed);
  }
);

it.each([timeAxes, mappedAxes])(
  'keeps time coordinates and numeric Y coordinates while panning and zooming',
  (axes) => {
    render(<Harness axes={axes} />);
    const current = chart();
    expect(current.data.datasets[0].data).toEqual(points);
    fireEvent.click(screen.getByText('Move'));
    fireEvent.mouseDown(screen.getByTestId('plot'), {
      button: 0,
      clientX: 90,
      clientY: 40,
    });
    fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 50 });
    expect(current.scales.x.min).toBeCloseTo((-1000 * 10) / 146);
    expect(current.scales.x.max).toBeCloseTo(1000 - (1000 * 10) / 146);
    expect(current.scales.y.min).toBeCloseTo(10 / 164);
    expect(current.scales.y.max).toBeCloseTo(1 + 10 / 164);
    fireEvent.mouseDown(screen.getByTestId('plot'), {
      button: 2,
      clientX: 100,
      clientY: 50,
    });
    fireEvent.mouseUp(document, { button: 2, clientX: 80, clientY: 50 });
    expect(current.scales.x.max - current.scales.x.min).toBeCloseTo(
      1000 * ZOOM_FACTOR_PER_PIXEL ** 20
    );
    expect(current.scales.y.max - current.scales.y.min).toBeCloseTo(1);
    expect(current.data.datasets[0].data).toEqual(points);
  }
);

it.each(['complete', 'Escape', 'blur'])(
  'publishes the latest data after gesture %s',
  (finish) => {
    const view = render(<Harness axes={mappedAxes} />);
    fireEvent.click(screen.getByText('Move'));
    fireEvent.mouseDown(screen.getByTestId('plot'), {
      button: 0,
      clientX: 90,
      clientY: 40,
    });
    const latest = [{ x: 500, y: 0.5 }];
    view.rerender(<Harness axes={mappedAxes} data={[{ x: 100, y: 0.1 }]} />);
    view.rerender(<Harness axes={mappedAxes} data={latest} />);
    expect(chart().data.datasets[0].data).toEqual(points);
    if (finish === 'complete')
      fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 50 });
    else if (finish === 'Escape')
      fireEvent.keyDown(document, { key: 'Escape' });
    else fireEvent.blur(window);
    expect(chart().data.datasets[0].data).toEqual(latest);
    if (finish !== 'complete') {
      expect(chart().scales.x).toMatchObject({ min: 0, max: 1000 });
      expect(chart().scales.y).toMatchObject({ min: 0, max: 1 });
    }
  }
);

it('refreshes unchanged data on Reset and restores model ranges', () => {
  const axes: PlotAxesConfig = {
    x: { ...timeAxes.x, range: [200, 300] },
    y: { ...mappedAxes.y, range: [10, 20] },
  };
  render(<Harness axes={axes} />);
  fireEvent.click(screen.getByText('Move'));
  fireEvent.mouseDown(screen.getByTestId('plot'), {
    button: 0,
    clientX: 90,
    clientY: 40,
  });
  fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 50 });
  fireEvent.click(screen.getByText('Reset'));
  expect(chart().scales.x).toMatchObject({ min: 200, max: 300 });
  expect(chart().scales.y).toMatchObject({ min: 10, max: 20 });
  const update = chart().update as jest.Mock;
  update.mockClear();
  fireEvent.click(screen.getByText('Reset'));
  expect(update).toHaveBeenCalledWith('none');
  expect(chart().data.datasets[0].data).toEqual(points);
});

it('publishes mutations of stable data through a revision without recreating the chart', () => {
  const data = [...points];
  const view = render(<Harness axes={mappedAxes} data={data} />);
  const current = chart();
  const update = current.update as jest.Mock;
  update.mockClear();
  data.push({ x: 2000, y: 2 });
  view.rerender(<Harness axes={mappedAxes} data={data} revision={1} />);
  expect(chart()).toBe(current);
  expect(update).toHaveBeenCalledWith('none');
  expect(current.scales.x.max).toBe(2000);
});

describe('right-button zoom', () => {
  it.each([
    { scale: 'linear', range: [0, 1000], dx: -40_000, failure: 'overflow' },
    {
      scale: 'linear',
      range: [-Number.MAX_VALUE / 2, Number.MAX_VALUE / 2],
      dx: -20,
      failure: 'span overflow with finite endpoints',
    },
    { scale: 'linear', range: [0, 1000], dx: 2_000, failure: 'collapsed span' },
    { scale: 'logarithmic', range: [1, 81], dx: -1_000, failure: 'overflow' },
    {
      scale: 'logarithmic',
      range: [Number.MIN_VALUE, 1],
      dx: -1,
      failure: 'underflow to zero',
    },
    {
      scale: 'logarithmic',
      range: [1, 81],
      dx: 2_000,
      failure: 'collapsed span',
    },
  ] as const)(
    'preserves the starting $scale range on $failure while zooming the other axis',
    ({ scale, range, dx }) => {
      const axes: PlotAxesConfig = {
        x: {
          ...timeAxes.x,
          kind: 'numeric',
          scale,
          range: [range[0], range[1]],
        },
        y: mappedAxes.y,
      };
      render(<Harness axes={axes} />);
      const current = chart();
      const initialX = { ...current.scales.x };
      const initialY = { ...current.scales.y };
      const { left, right, top, bottom } = current.chartArea;
      const start = {
        clientX: (left + right) / 2,
        clientY: (top + bottom) / 2,
      };
      const verticalDragPixels = -10;
      fireEvent.mouseDown(screen.getByTestId('plot'), {
        button: RIGHT_MOUSE_BUTTON,
        ...start,
      });
      fireEvent.mouseUp(document, {
        button: RIGHT_MOUSE_BUTTON,
        clientX: start.clientX + dx,
        clientY: start.clientY + verticalDragPixels,
      });
      expect(current.scales.x).toEqual(initialX);
      expect(current.scales.y.max - current.scales.y.min).toBeCloseTo(
        (initialY.max - initialY.min) *
          ZOOM_FACTOR_PER_PIXEL ** verticalDragPixels
      );
    }
  );

  it.each([
    { dx: 20, dy: 0 },
    { dx: 0, dy: -10 },
    { dx: 20, dy: -10 },
    { dx: -20, dy: 10 },
    { dx: 0, dy: 0 },
  ])('scales axes independently for movement $dx, $dy', ({ dx, dy }) => {
    render(<Harness axes={mappedAxes} />);
    const current = chart();
    const initialX = { ...current.scales.x };
    const initialY = { ...current.scales.y };
    fireEvent.mouseDown(screen.getByTestId('plot'), {
      button: 2,
      clientX: 88.5,
      clientY: 43,
    });
    fireEvent.mouseUp(document, {
      button: 2,
      clientX: 88.5 + dx,
      clientY: 43 + dy,
    });
    expect(current.scales.x.max - current.scales.x.min).toBeCloseTo(
      1000 * ZOOM_FACTOR_PER_PIXEL ** -dx
    );
    expect(current.scales.y.max - current.scales.y.min).toBeCloseTo(
      ZOOM_FACTOR_PER_PIXEL ** dy
    );
    // The off-center data point stays at 25% of X and 75% of Y.
    expect(
      (250 - current.scales.x.min) /
        (current.scales.x.max - current.scales.x.min)
    ).toBeCloseTo(0.25);
    expect(
      (0.75 - current.scales.y.min) /
        (current.scales.y.max - current.scales.y.min)
    ).toBeCloseTo(0.75);
    if (dx === 0) expect(current.scales.x).toEqual(initialX);
    if (dy === 0) expect(current.scales.y).toEqual(initialY);
  });

  it.each([
    { logarithmic: false, inverted: false },
    { logarithmic: false, inverted: true },
    { logarithmic: true, inverted: false },
    { logarithmic: true, inverted: true },
  ])(
    'keeps the clicked point fixed with logarithmic=$logarithmic, inverted=$inverted',
    ({ logarithmic, inverted }) => {
      const axes: PlotAxesConfig = {
        x: {
          ...timeAxes.x,
          kind: 'numeric',
          scale: logarithmic ? 'logarithmic' : 'linear',
          inverted,
          range: [1, 81],
        },
        y: {
          ...timeAxes.y,
          scale: logarithmic ? 'logarithmic' : 'linear',
          inverted,
          range: [1, 81],
        },
      };
      render(<Harness axes={axes} />);
      const current = chart();
      fireEvent.mouseDown(screen.getByTestId('plot'), {
        button: 2,
        clientX: 88.5,
        clientY: 43,
      });
      fireEvent.mouseUp(document, { button: 2, clientX: 108.5, clientY: 33 });
      const anchors = logarithmic
        ? inverted
          ? { x: 27, y: 3 }
          : { x: 3, y: 27 }
        : inverted
          ? { x: 61, y: 21 }
          : { x: 21, y: 61 };
      for (const axis of ['x', 'y'] as const) {
        const { min, max } = current.scales[axis];
        const value = logarithmic ? Math.log : (n: number) => n;
        const span = value(max) - value(min);
        const initialSpan = logarithmic ? Math.log(81) : 80;
        expect(span / initialSpan).toBeCloseTo(
          axis === 'x'
            ? ZOOM_FACTOR_PER_PIXEL ** -20
            : ZOOM_FACTOR_PER_PIXEL ** -10
        );
        const ratio = (value(anchors[axis]) - value(min)) / span;
        expect(ratio).toBeCloseTo(
          axis === 'x' ? (inverted ? 0.75 : 0.25) : inverted ? 0.25 : 0.75
        );
      }
    }
  );

  it.each([
    { dx: 20, dy: 0 },
    { dx: 0, dy: -10 },
    { dx: 0, dy: 0 },
  ])(
    'preserves unmoved logarithmic axes exactly for $dx, $dy',
    ({ dx, dy }) => {
      const axes: PlotAxesConfig = {
        x: {
          ...timeAxes.x,
          kind: 'numeric',
          scale: 'logarithmic',
          range: [3, 243],
        },
        y: { ...timeAxes.y, scale: 'logarithmic', range: [3, 243] },
      };
      render(<Harness axes={axes} />);
      fireEvent.mouseDown(screen.getByTestId('plot'), {
        button: 2,
        clientX: 88.5,
        clientY: 43,
      });
      fireEvent.mouseUp(document, {
        button: 2,
        clientX: 88.5 + dx,
        clientY: 43 + dy,
      });
      if (dx === 0) expect(chart().scales.x).toEqual({ min: 3, max: 243 });
      if (dy === 0) expect(chart().scales.y).toEqual({ min: 3, max: 243 });
    }
  );

  it.each([
    { scaleX: 1, scaleY: 1 },
    { scaleX: 2, scaleY: 3 },
    { scaleX: 0.5, scaleY: 0.75 },
  ])(
    'uses viewport pixels for sensitivity and chart pixels for the anchor at scene scale $scaleX, $scaleY',
    ({ scaleX, scaleY }) => {
      render(<Harness axes={mappedAxes} />);
      const current = chart();
      const container = screen.getByTestId('plot');
      const layoutSize = 200;
      const origin = { x: 10, y: 20 };
      Object.defineProperties(container, {
        offsetWidth: { value: layoutSize },
        offsetHeight: { value: layoutSize },
      });
      jest.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: origin.x,
        top: origin.y,
        right: origin.x + layoutSize * scaleX,
        bottom: origin.y + layoutSize * scaleY,
        width: layoutSize * scaleX,
        height: layoutSize * scaleY,
        x: origin.x,
        y: origin.y,
        toJSON: () => ({}),
      });
      const { left, bottom, width, height } = current.chartArea;
      const anchorRatio = { x: 0.25, y: 0.75 };
      const anchorValue = { x: 250, y: 0.75 };
      const start = {
        clientX: origin.x + (left + width * anchorRatio.x) * scaleX,
        clientY: origin.y + (bottom - height * anchorRatio.y) * scaleY,
      };
      const movement = { x: 20, y: -10 };
      fireEvent.mouseDown(container, { button: RIGHT_MOUSE_BUTTON, ...start });
      fireEvent.mouseUp(document, {
        button: RIGHT_MOUSE_BUTTON,
        clientX: start.clientX + movement.x,
        clientY: start.clientY + movement.y,
      });
      expect(current.scales.x.max - current.scales.x.min).toBeCloseTo(
        1000 * ZOOM_FACTOR_PER_PIXEL ** -movement.x
      );
      expect(current.scales.y.max - current.scales.y.min).toBeCloseTo(
        ZOOM_FACTOR_PER_PIXEL ** movement.y
      );
      for (const axis of ['x', 'y'] as const) {
        const { min, max } = current.scales[axis];
        expect((anchorValue[axis] - min) / (max - min)).toBeCloseTo(
          anchorRatio[axis]
        );
      }
    }
  );
});

it.each(['Pointer', 'Zoom', 'Move'])(
  'middle-click resets configured and automatic ranges in %s mode',
  (tool) => {
    for (const configured of [false, true]) {
      const axes: PlotAxesConfig = configured
        ? {
            x: { ...timeAxes.x, range: [0, 2000] },
            y: { ...mappedAxes.y, range: [-1, 2] },
          }
        : mappedAxes;
      const view = render(<Harness axes={axes} />);
      const current = chart();
      const initialX = { ...current.scales.x };
      const initialY = { ...current.scales.y };
      fireEvent.mouseDown(screen.getByTestId('plot'), {
        button: 1,
        clientX: 90,
        clientY: 40,
      });
      fireEvent.mouseUp(document, { button: 1, clientX: 110, clientY: 50 });
      expect(current.scales.x).not.toEqual(initialX);
      fireEvent.click(screen.getByText(tool));
      fireEvent.mouseDown(screen.getByTestId('plot'), {
        button: 1,
        clientX: 90,
        clientY: 40,
      });
      fireEvent.mouseUp(document, { button: 1, clientX: 92, clientY: 41 });
      expect(current.scales.x).toEqual(initialX);
      expect(current.scales.y).toEqual(initialY);
      view.unmount();
    }
  }
);

it('treats a three-chart-pixel middle drag as a pan', () => {
  render(<Harness axes={mappedAxes} />);
  fireEvent.mouseDown(screen.getByTestId('plot'), {
    button: 1,
    clientX: 90,
    clientY: 40,
  });
  fireEvent.mouseUp(document, { button: 1, clientX: 93, clientY: 40 });
  expect(chart().scales.x.min).toBeCloseTo(-3000 / 146);
  expect(chart().scales.x.max).toBeCloseTo(1000 - 3000 / 146);
});

describe('gesture animation frames', () => {
  let frames: Map<number, FrameRequestCallback>;
  let nextId: number;
  beforeEach(() => {
    frames = new Map();
    nextId = 0;
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.set(++nextId, callback);
        return nextId;
      });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
  });
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });
  function flush() {
    act(() => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(0));
    });
  }
  function start(button: number) {
    fireEvent.mouseDown(screen.getByTestId('plot'), {
      button,
      clientX: 90,
      clientY: 40,
    });
  }
  function move(clientX: number) {
    fireEvent.mouseMove(document, { clientX, clientY: 40 });
  }
  it.each([1, 2])(
    'coalesces button %s bursts and applies exact release coordinates',
    (button) => {
      render(<Harness axes={mappedAxes} />);
      const current = chart();
      const update = current.update as jest.Mock;
      update.mockClear();
      start(button);
      move(100);
      move(110);
      move(120);
      expect(update).not.toHaveBeenCalled();
      expect(frames.size).toBe(1);
      flush();
      expect(update).toHaveBeenCalledTimes(1);
      if (button === 1) expect(current.scales.x.min).toBeCloseTo(-30000 / 146);
      else
        expect(current.scales.x.max - current.scales.x.min).toBeCloseTo(
          1000 * ZOOM_FACTOR_PER_PIXEL ** -30
        );
      move(130);
      fireEvent.mouseUp(document, { button, clientX: 140, clientY: 40 });
      expect(frames.size).toBe(0);
      if (button === 1) expect(current.scales.x.min).toBeCloseTo(-50000 / 146);
      else
        expect(current.scales.x.max - current.scales.x.min).toBeCloseTo(
          1000 * ZOOM_FACTOR_PER_PIXEL ** -50
        );
      update.mockClear();
      flush();
      expect(update).not.toHaveBeenCalled();
    }
  );
  it.each(
    [1, 2].flatMap((button) =>
      ['Escape', 'blur', 'reset', 'unmount'].map((outcome) => ({
        button,
        outcome,
      }))
    )
  )(
    'cancels button $button queued frames on $outcome',
    ({ button, outcome }) => {
      const view = render(<Harness axes={mappedAxes} />);
      const current = chart();
      start(button);
      move(120);
      flush();
      expect(current.scales.x).not.toMatchObject({ min: 0, max: 1000 });
      move(130);
      expect(frames.size).toBe(1);
      if (outcome === 'Escape') fireEvent.keyDown(document, { key: 'Escape' });
      else if (outcome === 'blur') fireEvent.blur(window);
      else if (outcome === 'reset') fireEvent.click(screen.getByText('Reset'));
      else view.unmount();
      expect(frames.size).toBe(0);
      const update = current.update as jest.Mock;
      update.mockClear();
      flush();
      expect(update).not.toHaveBeenCalled();
      if (outcome !== 'unmount') {
        expect(current.scales.x).toMatchObject({ min: 0, max: 1000 });
        expect(current.scales.y).toMatchObject({ min: 0, max: 1 });
        fireEvent.mouseUp(document, { button, clientX: 140, clientY: 40 });
        expect(update).not.toHaveBeenCalled();
      }
    }
  );
  it('keeps a middle-button drag as a pan after returning near its starting point', () => {
    render(<Harness axes={mappedAxes} />);
    const current = chart();
    start(MIDDLE_MOUSE_BUTTON);
    fireEvent.mouseUp(document, {
      button: MIDDLE_MOUSE_BUTTON,
      clientX: 110,
      clientY: 40,
    });
    const pannedX = { ...current.scales.x };
    const { width } = current.chartArea;
    const initialSpan = pannedX.max - pannedX.min;
    const startClientX = 90;
    const returnDistancePixels = 2;
    start(MIDDLE_MOUSE_BUTTON);
    move(120);
    flush();
    move(startClientX + returnDistancePixels);
    flush();
    fireEvent.mouseUp(document, {
      button: MIDDLE_MOUSE_BUTTON,
      clientX: startClientX + returnDistancePixels,
      clientY: 40,
    });
    const shift = (initialSpan * returnDistancePixels) / width;
    expect(current.scales.x.min).toBeCloseTo(pannedX.min - shift);
    expect(current.scales.x.max).toBeCloseTo(pannedX.max - shift);
  });

  it('middle-click cancels its queued preview and resets once without panning', () => {
    render(<Harness axes={mappedAxes} />);
    const current = chart();
    start(1);
    fireEvent.mouseUp(document, { button: 1, clientX: 110, clientY: 50 });
    const update = current.update as jest.Mock;
    update.mockClear();
    start(1);
    move(92);
    expect(frames.size).toBe(1);
    fireEvent.mouseUp(document, { button: 1, clientX: 92, clientY: 40 });
    expect(frames.size).toBe(0);
    expect(current.scales.x).toMatchObject({ min: 0, max: 1000 });
    expect(current.scales.y).toMatchObject({ min: 0, max: 1 });
    expect(update).toHaveBeenCalledTimes(1);
    flush();
    fireEvent.mouseUp(document, { button: 1, clientX: 92, clientY: 40 });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('uses viewport movement for scaled-scene zoom previews and release', () => {
    render(<Harness axes={mappedAxes} />);
    const container = screen.getByTestId('plot');
    const sceneScale = 2;
    const layoutSize = 200;
    Object.defineProperties(container, {
      offsetWidth: { value: layoutSize },
      offsetHeight: { value: layoutSize },
    });
    jest.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: layoutSize * sceneScale,
      bottom: layoutSize * sceneScale,
      width: layoutSize * sceneScale,
      height: layoutSize * sceneScale,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const { left, right, top, bottom } = chart().chartArea;
    const start = {
      clientX: ((left + right) / 2) * sceneScale,
      clientY: ((top + bottom) / 2) * sceneScale,
    };
    fireEvent.mouseDown(container, { button: RIGHT_MOUSE_BUTTON, ...start });
    for (const movement of [
      { x: 20, y: -10 },
      { x: 30, y: -20 },
    ]) {
      fireEvent.mouseMove(document, {
        clientX: start.clientX + movement.x,
        clientY: start.clientY + movement.y,
      });
      flush();
      expect(chart().scales.x.max - chart().scales.x.min).toBeCloseTo(
        1000 * ZOOM_FACTOR_PER_PIXEL ** -movement.x
      );
      expect(chart().scales.y.max - chart().scales.y.min).toBeCloseTo(
        ZOOM_FACTOR_PER_PIXEL ** movement.y
      );
    }
    const releaseMovement = { x: 40, y: -30 };
    fireEvent.mouseUp(document, {
      button: RIGHT_MOUSE_BUTTON,
      clientX: start.clientX + releaseMovement.x,
      clientY: start.clientY + releaseMovement.y,
    });
    expect(chart().scales.x.max - chart().scales.x.min).toBeCloseTo(
      1000 * ZOOM_FACTOR_PER_PIXEL ** -releaseMovement.x
    );
    expect(chart().scales.y.max - chart().scales.y.min).toBeCloseTo(
      ZOOM_FACTOR_PER_PIXEL ** releaseMovement.y
    );
    expect(frames.size).toBe(0);
  });

  it('uses independent factors from starting ranges for previews and release', () => {
    render(<Harness axes={mappedAxes} />);
    start(2);
    fireEvent.mouseMove(document, { clientX: 110, clientY: 30 });
    flush();
    expect(chart().scales.x.max - chart().scales.x.min).toBeCloseTo(
      1000 * ZOOM_FACTOR_PER_PIXEL ** -20
    );
    expect(chart().scales.y.max - chart().scales.y.min).toBeCloseTo(
      ZOOM_FACTOR_PER_PIXEL ** -10
    );
    fireEvent.mouseMove(document, { clientX: 120, clientY: 20 });
    flush();
    expect(chart().scales.x.max - chart().scales.x.min).toBeCloseTo(
      1000 * ZOOM_FACTOR_PER_PIXEL ** -30
    );
    expect(chart().scales.y.max - chart().scales.y.min).toBeCloseTo(
      ZOOM_FACTOR_PER_PIXEL ** -20
    );
    fireEvent.mouseUp(document, { button: 2, clientX: 130, clientY: 10 });
    expect(chart().scales.x.max - chart().scales.x.min).toBeCloseTo(
      1000 * ZOOM_FACTOR_PER_PIXEL ** -40
    );
    expect(chart().scales.y.max - chart().scales.y.min).toBeCloseTo(
      ZOOM_FACTOR_PER_PIXEL ** -30
    );
  });

  it('defers replacement data while a gesture frame is pending', () => {
    const view = render(<Harness axes={mappedAxes} />);
    start(1);
    move(120);
    const latest = [{ x: 500, y: 0.5 }];
    view.rerender(<Harness axes={mappedAxes} data={latest} />);
    flush();
    expect(chart().data.datasets[0].data).toEqual(points);
    fireEvent.mouseUp(document, { button: 1, clientX: 140, clientY: 40 });
    expect(chart().data.datasets[0].data).toEqual(latest);
    expect(chart().scales.x.min).toBeCloseTo(-50000 / 146);
  });
});

it('middle click fits the latest pending data without restoring the previous gesture range', () => {
  const view = render(<Harness axes={mappedAxes} />);
  const container = screen.getByTestId('plot');
  fireEvent.mouseDown(container, { button: 1, clientX: 90, clientY: 40 });
  const latest = [...points, { x: 2000, y: 2 }];
  view.rerender(<Harness axes={mappedAxes} data={latest} />);
  expect(chart().data.datasets[0].data).toEqual(points);
  fireEvent.mouseUp(document, { button: 1, clientX: 90, clientY: 40 });
  expect(chart().data.datasets[0].data).toEqual(latest);
  expect(chart().scales.x).toMatchObject({ min: 0, max: 2000 });
  expect(chart().scales.y).toMatchObject({ min: 0, max: 2 });
});
