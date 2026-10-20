import { DisplayVectorGraphModel, buildModelConfig } from '@/karabo/common/api';
import { buildPlotAxes } from '../graphAxes';
import { TRACE_COLORS } from '../common/api';

import {
  vectorChartOption,
  vectorXYChartOption,
  vectorScatterChartOption,
} from '../plotConfig';
import { padViewportRange } from '../utils';

describe('vector Chart.js configuration', () => {
  it('uses the twelve desktop colors and wraps on the thirteenth curve', () => {
    const keys = Array.from({ length: 13 }, (_, index) => `DEV.${index}`);
    const datasets = vectorChartOption(
      buildModelConfig(new DisplayVectorGraphModel()),
      keys
    ).data.datasets;
    expect(datasets.map((dataset) => dataset.borderColor)).toEqual([
      '#3399ff',
      '#ff3333',
      '#33a02c',
      '#a6cee3',
      '#6a3d9a',
      '#ffff00',
      '#fb9a99',
      '#b15928',
      '#ff7f00',
      '#b2df8a',
      '#cab2d6',
      '#000000',
      '#3399ff',
    ]);
  });

  it('matches full keys, preserves blank names and keeps custom curves in the palette cycle', () => {
    const config = buildModelConfig(new DisplayVectorGraphModel());
    config.curve_options = [
      { key: 'DEV.a', name: 'Saved', pen_color: '#123456', curve_type: 1 },
      { key: 'DEV.b', name: '', pen_color: ' ', curve_type: 1 },
      {
        key: 'OTHER.c',
        name: 'Unmatched',
        pen_color: '#abcdef',
        curve_type: 1,
      },
    ];
    const keys = ['DEV.b', 'DEV.a', 'DEV.c'];
    expect(vectorChartOption(config, keys).data.datasets).toMatchObject([
      { label: '', borderColor: '#3399ff', backgroundColor: '#3399ff' },
      { label: 'Saved', borderColor: '#123456', backgroundColor: '#123456' },
      { label: 'DEV.c', borderColor: '#33a02c' },
    ]);
    expect(vectorXYChartOption(config, keys).data.datasets).toMatchObject([
      { label: 'DEV.b', borderColor: '#3399ff' },
      { label: 'DEV.a', borderColor: '#ff3333' },
      { label: 'DEV.c', borderColor: '#33a02c' },
    ]);
  });
  it('labels ordered datasets, cycles colors and disables line markers', () => {
    const keys = Array.from({ length: 7 }, (_, index) => `DEV.value${index}`);
    const config = vectorChartOption(
      buildModelConfig(new DisplayVectorGraphModel()),
      keys
    );
    expect(config.data.datasets.map((dataset) => dataset.label)).toEqual(keys);
    config.data.datasets.forEach((dataset, index) => {
      expect(dataset.borderColor).toBe(
        TRACE_COLORS[index % TRACE_COLORS.length]
      );
      expect(dataset.backgroundColor).toBe(dataset.borderColor);
    });
    for (const [index, length] of [299, 300].entries()) {
      const dataset = config.data.datasets[index];
      dataset.data = Array.from({ length }, (_, x) => ({ x, y: x }));
      expect(dataset.pointRadius).toBe(0);
    }
  });

  it('disables XY line markers while retaining scatter markers', () => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    expect(
      vectorXYChartOption(model, ['xy']).data.datasets[0].pointRadius
    ).toBe(0);
    expect(
      vectorScatterChartOption(model, ['xy']).data.datasets[0].pointRadius
    ).toBe(model.psize / 2);
  });

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
      align: 'center',
    });
    model.x_label = model.x_units = model.y_label = model.y_units = '';
    expect(vectorChartOption(model).options?.scales).toMatchObject({
      x: { title: { display: false } },
      y: { title: { display: false } },
    });
  });

  it('keeps axis gutters constant across tick label changes', () => {
    const scales = vectorChartOption(
      buildModelConfig(new DisplayVectorGraphModel())
    ).options!.scales as unknown as {
      x: { afterFit: (axis: { height: number }) => void };
      y: { afterFit: (axis: { width: number }) => void };
    };
    const x = { height: 60 };
    const y = { width: 30 };
    scales.x.afterFit(x);
    scales.y.afterFit(y);
    expect(x.height).toBe(34);
    expect(y.width).toBe(64);
    const titled = buildModelConfig(new DisplayVectorGraphModel());
    titled.x_label = 'Position';
    titled.y_label = 'Intensity';
    const titledScales = vectorChartOption(titled).options!
      .scales as unknown as typeof scales;
    titledScales.x.afterFit(x);
    titledScales.y.afterFit(y);
    expect(x.height).toBe(42);
    expect(y.width).toBe(80);
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
      vectorChartOption(model, [], {
        ...buildPlotAxes(model),
        x: { ...buildPlotAxes(model).x, range: [1, 100] },
        y: { ...buildPlotAxes(model).y, range: [0.1, 10] },
      }).options?.scales
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
