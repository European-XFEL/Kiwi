import React from 'react';
import { render } from '@testing-library/react';
import { DisplayVectorGraphModel } from '@/karabo/common/api';
import { useVectorChart } from '../useVectorChart';
import { useVectorGraphView } from '../useVectorGraphView';

jest.mock('echarts/core', () => {
  class Chart {
    static instances: Chart[] = [];
    setOption = jest.fn();
    resize = jest.fn();
    dispose = jest.fn();
    getWidth = () => 100;
    getHeight = () => 100;
    convertFromPixel = (_finder: unknown, value: number[]) => value;
    convertToPixel = (_finder: unknown, value: number[]) => value;

    constructor() {
      Chart.instances.push(this);
    }
  }

  return {
    init: jest.fn(() => new Chart()),
    use: jest.fn(),
    __Chart: Chart,
  };
});

jest.mock('echarts/charts', () => ({ LineChart: class LineChart {} }));
jest.mock('echarts/components', () => ({
  GridComponent: class GridComponent {},
  TitleComponent: class TitleComponent {},
}));
jest.mock('echarts/renderers', () => ({
  CanvasRenderer: class CanvasRenderer {},
}));

class ResizeObserverMock {
  observe = jest.fn();
  disconnect = jest.fn();
}

function VectorChartHarness({ model }: { model: DisplayVectorGraphModel }) {
  const view = useVectorGraphView();
  const { containerRef } = useVectorChart({
    model,
    values: new Float64Array([1, 2]),
    view,
  });
  return <div ref={containerRef} />;
}

describe('useVectorChart', () => {
  beforeEach(() => {
    Object.assign(global, { ResizeObserver: ResizeObserverMock });
    const { __Chart } = jest.requireMock('echarts/core');
    __Chart.instances = [];
  });

  it('configures every chart instance before applying series-only updates', () => {
    const model = new DisplayVectorGraphModel();

    render(
      <React.StrictMode>
        <VectorChartHarness model={model} />
      </React.StrictMode>
    );

    const { __Chart } = jest.requireMock('echarts/core');
    expect(__Chart.instances.length).toBeGreaterThan(1);
    for (const chart of __Chart.instances) {
      expect(chart.setOption.mock.calls[0][0]).toMatchObject({
        xAxis: { type: 'value' },
        yAxis: { type: 'value' },
        series: [{ type: 'line' }],
      });
    }
  });
});
