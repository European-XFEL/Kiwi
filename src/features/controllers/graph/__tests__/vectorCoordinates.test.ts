import { Chart, BasicPlatform, registerables } from 'chart.js';
import { DisplayVectorGraphModel } from '@/karabo/common/api';
import { buildModelConfig } from '../common/api';
import { vectorChartOption } from '../chartConfig';
import { vectorPoints, generateDownsample, padViewportRange } from '../utils';
import { lttbWithCoordinates } from '../../utils/lttb';

test.each([
  { offset: 10, step: 2, expected: [16, 18, 20, 22] },
  { offset: 30, step: -2, expected: [22, 20, 18, 16] },
  { offset: 10, step: -2, expected: [] },
  { offset: 16, step: 0, expected: [16, 17, 18, 19, 20, 21, 22] },
  { offset: 23, step: 0, expected: [] },
])(
  'samples padded ranges in source order with offset=$offset and step=$step',
  ({ offset, step, expected }) => {
    const x = Float64Array.from(
      { length: 201 },
      (_, i) => offset + i * (step || 1)
    );
    const [sampledX] = generateDownsample(x, x, padViewportRange([18, 20]));
    expect(Array.from(sampledX)).toEqual(expected);
  }
);

test('samples logarithmically padded ranges in original X coordinates', () => {
  const x = Float64Array.from({ length: 2000 }, (_, i) => 1 + i * 3);
  const [sampledX] = generateDownsample(
    x,
    x,
    padViewportRange([10, 100], true)
  );
  expect(sampledX).toHaveLength(334);
  expect(sampledX[0]).toBe(1);
  expect(sampledX.at(-1)).toBe(1000);
});

test.each([-2, 0])(
  'real Chart.js preserves all points and Y extrema for step %s',
  (step) => {
    Chart.register(...registerables);
    const canvas = document.createElement('canvas');
    const context = new Proxy(
      {
        canvas,
        measureText: (text: string) => ({ width: String(text).length * 6 }),
      },
      {
        get: (target, key) => Reflect.get(target, key) ?? (() => undefined),
      }
    ) as unknown as CanvasRenderingContext2D;
    jest.spyOn(canvas, 'getContext').mockReturnValue(context);
    const plotConfig = buildModelConfig(new DisplayVectorGraphModel());
    Object.assign(plotConfig, { offset: 20, step });
    const config = vectorChartOption(plotConfig);
    const data = vectorPoints(
      lttbWithCoordinates(
        [1, -50, 100, 2],
        Float64Array.from({ length: 4 }, (_, i) => 20 + i * (step || 1))
      )
    );
    config.data.datasets[0].data = data;
    if (step < 0)
      expect(config.options).toMatchObject({ parsing: {}, normalized: false });
    const chart = new Chart(canvas, {
      ...config,
      options: { ...config.options, responsive: false },
      platform: BasicPlatform,
    });
    try {
      expect(chart.getDatasetMeta(0).data).toHaveLength(4);
      expect(chart.scales.y.min).toBeLessThanOrEqual(-50);
      expect(chart.scales.y.max).toBeGreaterThanOrEqual(100);
      chart.options.scales!.x!.min = 13;
      chart.options.scales!.x!.max = 25;
      chart.update('none');
      expect(chart.scales.y.min).toBeLessThanOrEqual(-50);
      expect(chart.scales.y.max).toBeGreaterThanOrEqual(100);
    } finally {
      chart.destroy();
    }
  }
);
