import { DisplayTrendGraphModel, buildModelConfig } from '@/karabo/common/api';
import { fireEvent, render, screen } from '@testing-library/react';
import { Chart } from 'chart.js/auto';

import { useTrendChart } from '../../trend/api';

const START = 1_800_000_000_000;
const model = buildModelConfig(new DisplayTrendGraphModel());
const series = [
  { key: 'A.value', timestamps: [START, START + 1000], values: [1, 2] },
];

function TrendHarness({ data = series }: { data?: typeof series }) {
  const view = useTrendChart({
    plotConfig: model,
    series: data,
    startTime: START,
    dataRevision: 0,
  });
  return (
    <>
      <div ref={view.containerRef} data-testid="trend-chart" />
      <div ref={view.selectionRef} />
      <button onClick={() => view.selectTool('pointer')}>Pointer</button>
      <button onClick={() => view.selectTool('zoom')}>Zoom</button>
      <button onClick={() => view.selectTool('pan')}>Move</button>
      <button onClick={view.reset}>Reset</button>
      <output>{view.mode ?? 'paused'}</output>
    </>
  );
}

test('trend chart shares viewport pan and Reset navigation', () => {
  const { unmount } = render(<TrendHarness />);
  const chart = (
    Chart as unknown as { instances: Chart<'line'>[] }
  ).instances.at(-1)!;
  const initialMin = chart.options.scales?.x?.min;
  fireEvent.click(screen.getByRole('button', { name: 'Move' }));
  fireEvent.mouseDown(screen.getByTestId('trend-chart'), {
    button: 0,
    clientX: 90,
    clientY: 40,
  });
  fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 50 });
  expect(screen.getByText('paused')).toBeTruthy();
  expect(chart.options.scales?.x).toMatchObject({
    min: expect.any(Number),
    max: expect.any(Number),
  });
  expect(chart.options.scales?.x?.min).not.toBe(initialMin);
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByText('uptime')).toBeTruthy();
  expect(chart.scales.x).toEqual({ min: START, max: START + 1000 });
  unmount();
});

test('trend chart handles a right-button drag before using the toolbar', () => {
  render(<TrendHarness />);
  const chart = (
    Chart as unknown as { instances: Chart<'line'>[] }
  ).instances.at(-1)!;
  const container = screen.getByTestId('trend-chart');
  fireEvent.mouseDown(container, { button: 2, clientX: 90, clientY: 40 });
  fireEvent.mouseMove(document, { button: 2, clientX: 120, clientY: 40 });
  fireEvent.mouseUp(document, { button: 2, clientX: 120, clientY: 40 });
  expect(screen.getByText('paused')).toBeTruthy();
  expect(chart.options.scales?.x?.min).toEqual(expect.any(Number));
});

test.each(['Pointer', 'Zoom', 'Move'])(
  'middle-drag pauses and middle-click resumes trend uptime in %s mode',
  (tool) => {
    const view = render(<TrendHarness />);
    const chart = (
      Chart as unknown as { instances: Chart<'line'>[] }
    ).instances.at(-1)!;
    const container = screen.getByTestId('trend-chart');
    const initialX = { ...chart.scales.x };
    fireEvent.click(screen.getByRole('button', { name: tool }));
    fireEvent.mouseDown(container, { button: 1, clientX: 90, clientY: 40 });
    fireEvent.mouseUp(document, { button: 1, clientX: 110, clientY: 50 });
    expect(screen.getByText('paused')).toBeTruthy();
    expect(chart.scales.x).not.toEqual(initialX);
    fireEvent.mouseDown(container, { button: 1, clientX: 90, clientY: 40 });
    fireEvent.mouseUp(document, { button: 1, clientX: 92, clientY: 41 });
    expect(screen.getByText('uptime')).toBeTruthy();
    expect(chart.scales.x.min).toBe(initialX.min);
    view.rerender(
      <TrendHarness
        data={[
          { key: 'A.value', timestamps: [START, START + 2000], values: [1, 3] },
        ]}
      />
    );
    expect(chart.scales.x.max).toBe(START + 2000);
  }
);
