import { DisplayVectorGraphModel } from '@/karabo/common/api';
import {
  vectorChartOption,
  vectorSeriesOption,
  chooseVectorTargetPoints,
  visibleVectorRange,
} from '../vectorChartConfig';

describe('vectorChartOption', () => {
  it('uses model axis labels and units without inventing fallback labels', () => {
    const model = new DisplayVectorGraphModel();
    model.x_label = 'Position';
    model.x_units = 'mm';
    model.y_label = 'Intensity';
    model.y_units = 'counts';

    expect(vectorChartOption(model, new Float64Array([2, 4]))).toMatchObject({
      xAxis: { name: 'Position (mm)' },
      yAxis: { name: 'Intensity (counts)' },
      series: [{ sampling: 'none' }],
    });

    model.x_label = '';
    model.x_units = '';
    model.y_label = '';
    model.y_units = '';

    expect(vectorChartOption(model, new Float64Array())).toMatchObject({
      xAxis: { name: '' },
      yAxis: { name: '' },
    });
  });

  it('passes interleaved typed points directly to ECharts', () => {
    const points = new Float64Array([0, 4, 1, 8]);

    expect(vectorSeriesOption(points)).toMatchObject({
      data: points,
      dimensions: ['x', 'y'],
      encode: { x: 'x', y: 'y' },
      sampling: 'none',
    });
  });

  it('calculates a linear x range with one viewport of pan overscan', () => {
    expect(visibleVectorRange(10, [4, 5])).toEqual([3, 7]);
  });

  it('returns an empty view when panning beyond the vector', () => {
    expect(visibleVectorRange(2, [20, 30])).toEqual([0, 0]);
  });

  it('uses multiplicative overscan for a logarithmic x view', () => {
    expect(visibleVectorRange(2_000, [10, 100], true)).toEqual([1, 1001]);
  });

  it('uses the configured dimension thresholds', () => {
    expect(
      [200_000, 300_000, 400_000, 500_000].map(chooseVectorTargetPoints)
    ).toEqual([30_000, 40_000, 50_000, 60_000]);
  });
});
