import { buildModelConfig } from '../../common/api';
import { VectorBarGraphModel } from '@/karabo/common/api';
import { BAR_SAMPLE_LIMIT, barChartOption } from '../configBarChart';
import { vectorBarPlugin } from '../vectorBarPlugin';

describe('bar Chart.js configuration', () => {
  it('keeps X linear and honors Y options', () => {
    const sceneModel = new VectorBarGraphModel();
    sceneModel.x_log = true;
    const model = buildModelConfig(sceneModel);
    model.y_invert = true;
    model.y_grid = true;
    const config = barChartOption(model);
    expect(config.options?.scales).toMatchObject({
      x: { type: 'linear' },
      y: { reverse: true, beginAtZero: true, grid: { drawOnChartArea: true } },
    });
    expect(config.data.datasets[0]).toMatchObject({
      showLine: false,
      pointRadius: 0,
    });
    expect(BAR_SAMPLE_LIMIT).toBe(3000);
    model.y_log = true;
    expect(barChartOption(model).options?.scales?.y).toMatchObject({
      type: 'logarithmic',
      reverse: true,
    });
  });

  it('draws positive and negative bars at indices with zoom dependent width', () => {
    const fillRect = jest.fn();
    const chart = {
      ctx: {
        save: jest.fn(),
        beginPath: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
        fillRect,
        restore: jest.fn(),
      },
      chartArea: { left: 0, top: 0, width: 200, height: 100 },
      scales: {
        x: { getPixelForValue: (value: number) => value * 10 },
        y: {
          type: 'linear',
          getPixelForValue: (value: number) => 50 - value * 10,
        },
      },
      data: {
        datasets: [
          {
            data: [
              { x: 2, y: 3 },
              { x: 5, y: -2 },
            ],
          },
        ],
      },
    };
    const draw = vectorBarPlugin(0.8).afterDatasetsDraw!;
    draw(chart as never, {} as never, {} as never, false);
    expect(fillRect.mock.calls).toEqual([
      [16, 20, 8, 30],
      [46, 50, 8, 20],
    ]);
    chart.scales.x.getPixelForValue = (value: number) => value * 20;
    fillRect.mockClear();
    draw(chart as never, {} as never, {} as never, false);
    expect(fillRect.mock.calls).toEqual([
      [32, 20, 16, 30],
      [92, 50, 16, 20],
    ]);
  });
});
