import { Chart, BasicPlatform, registerables } from 'chart.js';
import { DisplayVectorGraphModel } from '@/karabo/common/api';
import { buildModelConfig } from '../common/api';
import { vectorChartOption } from '../chartConfig';
import { vectorPoints, visibleVectorRange } from '../utils';
import { lttbWithCoordinates } from '../../utils/lttb';

test('inverts padded displayed ranges into ordered source bounds', () => {
  expect(
    visibleVectorRange(20, [18, 20], false, { offset: 10, step: 2 })
  ).toEqual([3, 7]);
  expect(
    visibleVectorRange(20, [18, 20], false, { offset: 30, step: -2 })
  ).toEqual([4, 8]);
  expect(
    visibleVectorRange(20, [18, 20], false, { offset: 10, step: -2 })
  ).toEqual([0, 0]);
  expect(
    visibleVectorRange(2000, [10, 100], true, { offset: 1, step: 3 })
  ).toEqual([0, 334]);
  expect(
    visibleVectorRange(20, [18, 20], false, { offset: 16, step: 0 })
  ).toEqual([0, 7]);
  expect(
    visibleVectorRange(20, [18, 20], false, { offset: 23, step: 0 })
  ).toEqual([0, 0]);
  expect(
    visibleVectorRange(20, undefined, false, { offset: 23, step: 0 })
  ).toEqual([0, 20]);
  expect(
    visibleVectorRange(0, [18, 20], false, { offset: 19, step: 0 })
  ).toEqual([0, 0]);
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
      lttbWithCoordinates([1, -50, 100, 2], 4, plotConfig)
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
