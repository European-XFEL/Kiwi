import { VectorBarGraphModel, buildModelConfig } from '@/karabo/common/api';
import { BasicPlatform, BarElement, Chart, registerables } from 'chart.js';

import { BAR_BLUE } from '../common/constants';
import { barChartOption } from '../plotConfig';

Chart.register(...registerables);

afterEach(() => {
  Object.values(Chart.instances).forEach((chart) => chart.destroy());
  jest.restoreAllMocks();
});

function createChart(model = new VectorBarGraphModel()) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 400;
  const drawing = new Proxy(
    {
      canvas,
      measureText: (text: string) => ({ width: String(text).length * 7 }),
      rect: jest.fn(),
    },
    { get: (target, key) => Reflect.get(target, key) ?? (() => undefined) }
  ) as unknown as CanvasRenderingContext2D;
  jest.spyOn(canvas, 'getContext').mockReturnValue(drawing);
  const config = barChartOption(buildModelConfig(model), [0, 4], [-4, 4]);
  Object.assign(config.options!.scales!.x!.ticks!, { stepSize: 1 });
  config.data.datasets[0].data = [
    { x: 1, y: 3 },
    { x: 2, y: -2 },
    { x: 3, y: 0 },
  ];
  return new Chart(canvas, {
    ...config,
    options: { ...config.options, responsive: false },
    platform: BasicPlatform,
  });
}

describe('bar Chart.js configuration', () => {
  it('uses native bars with model axes and chart-area clipping', () => {
    const model = buildModelConfig(new VectorBarGraphModel());
    model.y_invert = true;
    model.y_grid = true;
    const config = barChartOption(model);
    expect(config.type).toBe('bar');
    expect(config.options?.scales).toMatchObject({
      x: { type: 'linear', offset: false, grid: { offset: false } },
      y: { reverse: true, beginAtZero: true, grid: { drawOnChartArea: true } },
    });
    expect(config.data.datasets[0]).toMatchObject({
      backgroundColor: BAR_BLUE,
      borderColor: 'black',
      borderWidth: 1,
      inflateAmount: 0,
      grouped: false,
      categoryPercentage: 1,
      barPercentage: 0.1,
      clip: 0,
    });
    model.y_log = true;
    expect(barChartOption(model).options?.scales?.y).toMatchObject({
      type: 'logarithmic',
      reverse: true,
      beginAtZero: false,
    });
  });

  it.each([
    [0.1, 0.1],
    [0.5, 0.5],
    [0.75, 0.75],
    [1, 1],
    [2, 1],
    [0, 0],
  ])('caps bar_width=%s to a fraction of %s', (width, expected) => {
    const model = buildModelConfig(new VectorBarGraphModel());
    model.bar_width = width;
    expect(barChartOption(model).data.datasets[0]).toMatchObject({
      barPercentage: expected,
    });
  });

  it.each([false, true])(
    'renders signed bars through zoom and resize (inverted=%s)',
    (inverted) => {
      const model = new VectorBarGraphModel();
      model.bar_width = 0.5;
      model.x_invert = inverted;
      model.y_invert = inverted;
      const chart = createChart(model);
      const check = () => {
        const bars = chart.getDatasetMeta(0).data as BarElement[];
        bars.forEach((bar, index) => {
          expect(bar).toBeInstanceOf(BarElement);
          expect(bar.x).toBeCloseTo(chart.scales.x.getPixelForValue(index + 1));
          expect(bar.getProps(['width']).width).toBeCloseTo(
            chart.chartArea.width /
              (chart.scales.x.max - chart.scales.x.min) /
              2
          );
          expect(bar.options.backgroundColor).toBe(BAR_BLUE);
          expect(bar.options.borderColor).toBe('black');
          expect(bar.options.borderWidth).toBe(1);
        });
        const direction = inverted ? -1 : 1;
        expect(
          (bars[0].getProps(['base']).base - bars[0].y) * direction
        ).toBeGreaterThan(0);
        expect(
          (bars[1].getProps(['base']).base - bars[1].y) * direction
        ).toBeLessThan(0);
        expect(bars[2].getProps(['height']).height).toBe(0);
        expect(chart.ctx.rect).toHaveBeenCalledWith(
          chart.chartArea.left,
          chart.chartArea.top,
          chart.chartArea.width,
          chart.chartArea.height
        );
      };
      check();
      chart.options.scales!.x!.min = 1;
      chart.options.scales!.x!.max = 3;
      chart.update('none');
      check();
      chart.resize(400, 200);
      check();
    }
  );

  it.each([false, true])(
    'renders native bars on logarithmic axes (inverted=%s)',
    (inverted) => {
      const chart = createChart();
      chart.options.scales!.x!.type = 'logarithmic';
      chart.options.scales!.x!.min = 0.5;
      chart.options.scales!.x!.max = 5;
      chart.options.scales!.x!.reverse = inverted;
      chart.options.scales!.y!.type = 'logarithmic';
      chart.options.scales!.y!.min = 1;
      chart.options.scales!.y!.max = 100;
      chart.options.scales!.y!.reverse = inverted;
      chart.data.datasets[0].data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
      ];
      chart.update('none');
      const bars = chart.getDatasetMeta(0).data as BarElement[];
      bars.forEach((bar, index) => {
        expect(bar).toBeInstanceOf(BarElement);
        expect(bar.x).toBeCloseTo(chart.scales.x.getPixelForValue(index + 1));
        expect(bar.y).toBeCloseTo(
          chart.scales.y.getPixelForValue((index + 1) * 10)
        );
        expect(bar.getProps(['base']).base).toBeCloseTo(
          chart.scales.y.getPixelForValue(1)
        );
        expect(bar.getProps(['width']).width).toBeGreaterThan(0);
      });
    }
  );
});
