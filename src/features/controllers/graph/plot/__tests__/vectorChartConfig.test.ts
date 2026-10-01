import { DisplayVectorGraphModel } from '@/karabo/common/api';
import {
  vectorChartOption,
  chooseVectorTargetPoints,
} from '../configVectorChart';
import { vectorPoints, visibleVectorRange } from '../vectorRange';

describe('vector Chart.js configuration', () => {
  it('uses model axis labels and units', () => {
    const model = new DisplayVectorGraphModel();
    model.x_label = 'Position';
    model.x_units = 'mm';
    model.y_label = 'Intensity';
    model.y_units = 'counts';
    expect(vectorChartOption(model).options).toMatchObject({
      layout: { autoPadding: false },
      scales: {
        x: { type: 'linear', reverse: false, title: { text: 'Position (mm)' } },
        y: {
          type: 'linear',
          reverse: false,
          title: { text: 'Intensity (counts)' },
        },
      },
    });
    expect(vectorChartOption(model).options?.scales?.x?.ticks).toMatchObject({
      align: 'inner',
    });
    model.x_label = model.x_units = model.y_label = model.y_units = '';
    expect(vectorChartOption(model).options?.scales).toMatchObject({
      x: { title: { display: false } },
      y: { title: { display: false } },
    });
  });

  it('splits interleaved sampled points into coordinates', () => {
    expect(vectorPoints(new Float64Array([0, 4, 1, 8]))).toEqual([
      { x: 0, y: 4 },
      { x: 1, y: 8 },
    ]);
  });

  it('keeps axis gutters constant across tick label changes', () => {
    const scales = vectorChartOption(new DisplayVectorGraphModel()).options!
      .scales as unknown as {
      x: { afterFit: (axis: { height: number }) => void };
      y: { afterFit: (axis: { width: number }) => void };
    };
    const x = { height: 60 };
    const y = { width: 90 };
    scales.x.afterFit(x);
    scales.y.afterFit(y);
    expect(x.height).toBe(34);
    expect(y.width).toBe(52);
    const titled = new DisplayVectorGraphModel();
    titled.x_label = 'Position';
    titled.y_label = 'Intensity';
    const titledScales = vectorChartOption(titled).options!
      .scales as unknown as typeof scales;
    titledScales.x.afterFit(x);
    titledScales.y.afterFit(y);
    expect(x.height).toBe(42);
    expect(y.width).toBe(68);
  });

  it('keeps fixed logarithmic and inverted axes', () => {
    const model = new DisplayVectorGraphModel();
    Object.assign(model, {
      x_log: true,
      y_log: true,
      x_invert: true,
      y_invert: true,
    });
    expect(
      vectorChartOption(model, [1, 100], [0.1, 10]).options?.scales
    ).toMatchObject({
      x: { min: 1, max: 100, type: 'logarithmic', reverse: true },
      y: { min: 0.1, max: 10, type: 'logarithmic', reverse: true },
    });
  });

  it('calculates viewport overscan and downsampling thresholds', () => {
    expect(visibleVectorRange(10, [4, 5])).toEqual([3, 7]);
    expect(visibleVectorRange(2, [20, 30])).toEqual([0, 0]);
    expect(visibleVectorRange(2_000, [10, 100], true)).toEqual([1, 1001]);
    expect(chooseVectorTargetPoints(1_499_999)).toBe(1_499_999);
    expect(chooseVectorTargetPoints(1_500_000)).toBe(60_000);
  });
});
