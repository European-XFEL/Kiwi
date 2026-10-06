import { buildModelConfig } from '../../common/api';
import { DisplayTrendGraphModel } from '@/karabo/common/api';
import { trendChartOption, trendDatasets } from '../trendConfig';
import { buildPlotAxes } from '../../graphAxes';
import { formatValueTick } from '../../common/api';
import { STATE_LABELS, ALARM_LABELS } from '../categories';

const series = [
  { key: 'A.value', timestamps: [1000, 2000], values: [1, 2] },
  { key: 'B.value', timestamps: [1500], values: [3] },
];

describe('trend Chart.js configuration', () => {
  it.each([
    ['', 52],
    ['Value', 68],
  ])(
    'fixes numeric Y width for title %s without publishing a measured width',
    (label, width) => {
      const model = buildModelConfig(new DisplayTrendGraphModel());
      model.y_label = label;
      const onYAxisWidth = jest.fn();
      const axes = buildPlotAxes(model, { timeX: true });
      const config = trendChartOption(
        model,
        series,
        undefined,
        undefined,
        axes,
        onYAxisWidth
      );
      const scale = { width: 120 };
      config.options!.scales!.y!.afterFit!(scale as never);
      expect(scale.width).toBe(width);
      expect(onYAxisWidth).not.toHaveBeenCalled();
      expect(axes.y).not.toHaveProperty('onYAxisWidth');
    }
  );
  it.each([[STATE_LABELS], [ALARM_LABELS]])(
    'uses linear categorical axes with every integer tick and automatic label width',
    (categories) => {
      const model = buildModelConfig(new DisplayTrendGraphModel());
      Object.assign(model, {
        y_log: true,
        y_invert: true,
        y_autorange: false,
        y_min: 0.5,
        y_max: 3.5,
      });
      const onYAxisWidth = jest.fn();
      const axes = buildPlotAxes(model, {
        timeX: true,
        categories,
      });
      const option = trendChartOption(
        model,
        series,
        undefined,
        undefined,
        axes,
        onYAxisWidth
      );
      expect(option.options?.scales?.y).toMatchObject({
        type: 'linear',
        reverse: true,
        min: 0.5,
        max: 3.5,
        ticks: { autoSkip: false },
      });
      expect(option.data.datasets[0]).toMatchObject({
        tension: 0,
        stepped: false,
      });
      const y = option.options!.scales!.y! as unknown as {
        afterBuildTicks: (axis: unknown) => void;
        afterFit: (axis: unknown) => void;
        ticks: { callback: (value: number) => string };
      };
      const scale = {
        min: 0.5,
        max: 3.5,
        width: 90,
        ticks: [] as { value: number }[],
        chart: {
          ctx: {
            save: jest.fn(),
            restore: jest.fn(),
            measureText: (label: string) => ({ width: label.length * 7 }),
          },
        },
      };
      y.afterBuildTicks(scale);
      expect(scale.ticks).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }]);
      expect(y.ticks.callback(1)).toBe(categories[1]);
      for (const value of [1.5, -1, 100, NaN])
        expect(y.ticks.callback(value)).toBe('');
      y.afterFit(scale);
      expect(scale.width).toBe(90);
      scale.min = 0;
      scale.max = categories.length - 1;
      y.afterBuildTicks(scale);
      expect(scale.ticks.map(({ value }) => y.ticks.callback(value))).toEqual(
        categories
      );
      expect(onYAxisWidth).toHaveBeenLastCalledWith(90);
      scale.min = 1.9;
      scale.max = 2.1;
      y.afterBuildTicks(scale);
      // Chart.js has fitted a narrower axis to the remaining label.
      scale.width = 40;
      y.afterFit(scale);
      expect(scale.ticks).toEqual([{ value: 2 }]);
      expect(scale.width).toBe(40);
      expect(onYAxisWidth).toHaveBeenLastCalledWith(40);
    }
  );
  it('keeps independent timestamps and configures the existing colors and axes', () => {
    const model = buildModelConfig(new DisplayTrendGraphModel());
    model.title = 'Temperatures';
    model.x_label = 'Time';
    model.x_units = 's';
    model.y_units = 'K';
    model.x_grid = true;
    model.y_grid = true;
    const option = trendChartOption(model, series);
    expect(trendDatasets(series)).toMatchObject([
      {
        label: 'A.value',
        data: [
          { x: 1000, y: 1 },
          { x: 2000, y: 2 },
        ],
        borderColor: '#009be5',
        spanGaps: true,
      },
      { label: 'B.value', data: [{ x: 1500, y: 3 }], borderColor: '#ff0040' },
    ]);
    expect(option.options).toMatchObject({
      animation: false,
      plugins: { legend: { display: false } },
      layout: { autoPadding: false, padding: { top: 18, right: 2 } },
      scales: {
        x: {
          type: 'linear',
          reverse: false,
          title: { text: 'Time (s)' },
          grid: { drawOnChartArea: true },
          ticks: { align: 'center' },
        },
        y: {
          type: 'linear',
          reverse: false,
          title: { text: '(K)' },
          grid: { drawOnChartArea: true },
        },
      },
    });
  });

  it('applies fixed ranges, logarithmic Y and inversion', () => {
    const model = buildModelConfig(new DisplayTrendGraphModel());
    Object.assign(model, {
      x_autorange: false,
      x_min: 1,
      x_max: 4,
      y_autorange: false,
      y_min: 0.1,
      y_max: 100,
      x_invert: true,
      y_invert: true,
      y_log: true,
    });
    const axes = buildPlotAxes(model, { timeX: true });
    expect(axes.x.range).toEqual([1000, 4000]);
    expect(axes.y.range).toEqual([0.1, 100]);
    expect(trendChartOption(model, series).options?.scales).toMatchObject({
      x: { min: 1000, max: 4000, reverse: true },
      y: { min: 0.1, max: 100, type: 'logarithmic', reverse: true },
    });
  });

  it('recomputes time ticks for the visible range and chart width', () => {
    const axis = trendChartOption(
      buildModelConfig(new DisplayTrendGraphModel()),
      series
    ).options!.scales!.x! as unknown as {
      afterBuildTicks: (scale: unknown) => void;
      ticks: { callback: (value: number) => string };
    };
    const scale = {
      min: 0,
      max: 60_000,
      width: 600,
      ticks: [] as { value: number }[],
      chart: {
        width: 670,
        ctx: {
          save: jest.fn(),
          restore: jest.fn(),
          measureText: jest.fn((label: string) => ({
            width: label.length * 7,
          })),
        },
      },
    };
    axis.afterBuildTicks(scale);
    const wide = scale.ticks.map(({ value }) => value);
    expect(axis.ticks.callback(wide[0])).not.toBe('');
    scale.width = 200;
    axis.afterBuildTicks(scale);
    expect(scale.ticks.length).toBeLessThan(wide.length);
    scale.min = 60_000;
    scale.max = 120_000;
    axis.afterBuildTicks(scale);
    expect(scale.ticks[0].value).toBeGreaterThan(wide[0]);
  });

  it.each([[undefined], [STATE_LABELS]] as const)(
    'sizes time tick spacing to the plot area after the Y-axis width (%p)',
    (categories) => {
      const model = buildModelConfig(new DisplayTrendGraphModel());
      const axis = trendChartOption(
        model,
        series,
        undefined,
        undefined,
        buildPlotAxes(model, { timeX: true, categories })
      ).options!.scales!.x! as unknown as {
        afterBuildTicks: (scale: unknown) => void;
      };
      const start = new Date('2026-09-30T23:39:12').getTime();
      const scale = {
        min: start,
        max: start + 3 * 60_000,
        width: 420,
        ticks: [] as { value: number }[],
        chart: {
          width: 420,
          scales: { y: { width: 52 } },
          ctx: {
            save: jest.fn(),
            restore: jest.fn(),
            measureText: jest.fn((label: string) => ({
              width: label.length * 7,
            })),
          },
        },
      };

      axis.afterBuildTicks(scale);

      expect(scale.ticks.map(({ value }) => value - start)).toEqual([
        48_000, 108_000, 168_000,
      ]);
      if (categories) {
        scale.chart.scales.y.width = 300;
        axis.afterBuildTicks(scale);
        expect(scale.ticks.length).toBeLessThan(3);
      }
    }
  );

  it('keeps the plot rectangle stable when tick labels change', () => {
    const scales = trendChartOption(
      buildModelConfig(new DisplayTrendGraphModel()),
      series
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
    const titled = buildModelConfig(new DisplayTrendGraphModel());
    titled.x_label = 'Time';
    titled.y_label = 'Value';
    const titledScales = trendChartOption(titled, series).options!
      .scales as unknown as typeof scales;
    titledScales.x.afterFit(x);
    titledScales.y.afterFit(y);
    expect(x.height).toBe(42);
    expect(y.width).toBe(68);
  });

  it.each([
    [1, '1'],
    [1.2, '1.2'],
    [1.234, '1.23'],
    [0.001234, '1.23e-3'],
    [1e9, '1e+9'],
  ])('formats numeric tick %s', (value, expected) => {
    expect(formatValueTick(value)).toBe(expected);
  });
});
