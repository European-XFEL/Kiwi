import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import { DisplayVectorGraphModel } from '@/karabo/common/api';
import { useVectorChart } from '../graph/useVectorChart';

function VectorChartHarness({ model }: { model: DisplayVectorGraphModel }) {
  const { containerRef, selectTool } = useVectorChart({
    model,
    proxy: undefined,
  });
  return (
    <>
      <div ref={containerRef} data-testid="vector-chart" />
      <button onClick={() => selectTool('pan')}>Move</button>
    </>
  );
}

type MockChart = Chart<'line'> & { update: jest.Mock; destroy: jest.Mock };
const charts = () => (Chart as unknown as { instances: MockChart[] }).instances;
const chart = () => charts().at(-1)!;

describe('useVectorChart with Chart.js', () => {
  beforeEach(() => {
    charts().length = 0;
  });

  it('creates and disposes charts in strict mode', () => {
    const model = new DisplayVectorGraphModel();
    model.x_label = 'Position';
    model.y_label = 'Intensity';
    const { unmount } = render(
      <React.StrictMode>
        <VectorChartHarness model={model} />
      </React.StrictMode>
    );
    expect(charts().length).toBeGreaterThan(1);
    expect(chart().options.scales).toMatchObject({
      x: { title: { text: 'Position' } },
      y: { title: { text: 'Intensity' } },
    });
    unmount();
    expect(chart().destroy).toHaveBeenCalled();
  });

  it('updates the displayed range while panning', () => {
    render(<VectorChartHarness model={new DisplayVectorGraphModel()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    const container = screen.getByTestId('vector-chart');
    fireEvent.mouseDown(container, { button: 0, clientX: 90, clientY: 40 });
    fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 50 });
    expect(chart().update).toHaveBeenCalled();
    expect(chart().options.scales?.x).toMatchObject({
      min: expect.any(Number),
      max: expect.any(Number),
    });
  });
});
