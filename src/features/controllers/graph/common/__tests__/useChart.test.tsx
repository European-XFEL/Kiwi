import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import { DisplayTrendGraphModel } from '@/karabo/common/api';
import {
  buildModelConfig,
  buildPlotAxes,
  commonChartOption,
  integerTickFormatter,
  useChart,
  useChartRanges,
  type PlotAxesConfig,
} from '../api';

type Point = { x: number; y: number };
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
}: {
  axes: PlotAxesConfig;
  data?: Point[];
  revision?: number;
}) {
  const ranges = useChartRanges(axes);
  const buildData = React.useCallback(() => ({ datasets: [{ data }] }), [data]);
  const plot = useChart({
    axes,
    configuration: () => commonChartOption(model, axes),
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
      <button onClick={() => plot.selectTool('pan')}>Move</button>
      <button onClick={plot.reset}>Reset</button>
    </>
  );
}

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
      1000 * Math.exp(-0.2)
    );
    expect(current.scales.y.max - current.scales.y.min).toBeCloseTo(
      Math.exp(-0.2)
    );
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

it('refreshes unchanged data on reset and restores configured ranges', () => {
  const axes: PlotAxesConfig = {
    x: { ...timeAxes.x, range: [0, 2000] },
    y: { ...mappedAxes.y, range: [-1, 2] },
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
  expect(chart().scales.x).toMatchObject({ min: 0, max: 2000 });
  expect(chart().scales.y).toMatchObject({ min: -1, max: 2 });
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
