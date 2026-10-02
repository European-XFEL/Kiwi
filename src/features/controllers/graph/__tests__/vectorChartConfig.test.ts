import { buildModelConfig } from '../common/api';
import { DisplayVectorGraphModel } from '@/karabo/common/api';
import { vectorChartOption } from '../chartConfig';
import { vectorPoints, padViewportRange } from '../utils';

describe('vector Chart.js configuration', () => {
  it('uses model axis labels and units', () => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
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

  it('combines sampled vectors into chart coordinates', () => {
    expect(
      vectorPoints([new Float64Array([0, 1]), new Float64Array([4, 8])])
    ).toEqual([
      { x: 0, y: 4 },
      { x: 1, y: 8 },
    ]);
  });

  it('keeps axis gutters constant across tick label changes', () => {
    const scales = vectorChartOption(
      buildModelConfig(new DisplayVectorGraphModel())
    ).options!.scales as unknown as {
      x: { afterFit: (axis: { height: number }) => void };
      y: { afterFit: (axis: { width: number }) => void };
    };
    const x = { height: 60 };
    const y = { width: 90 };
    scales.x.afterFit(x);
    scales.y.afterFit(y);
    expect(x.height).toBe(34);
    expect(y.width).toBe(52);
    const titled = buildModelConfig(new DisplayVectorGraphModel());
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
    const model = buildModelConfig(new DisplayVectorGraphModel());
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

  it('calculates viewport overscan', () => {
    expect(padViewportRange([4, 5])).toEqual([3, 6]);
    expect(padViewportRange([20, 30])).toEqual([10, 40]);
    expect(padViewportRange([10, 100], true)).toEqual([1, 1000]);
    expect(padViewportRange()).toBeUndefined();
    expect(padViewportRange([5, 4])).toEqual([3, 6]);
    expect(padViewportRange([-1, 1], true)).toEqual([-3, 3]);
  });
});
