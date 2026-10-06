import { BasicPlatform, Chart, registerables } from 'chart.js';
import { DisplayVectorGraphModel } from '@/karabo/common/api';
import { buildModelConfig } from '../common/buildModelConfig';
import { commonChartOption } from '../common/commonConfig';
import { buildPlotAxes } from '../graphAxes';
import { STATE_LABELS, ALARM_LABELS } from '../trend/categories';

Chart.register(...registerables);

it.each([[STATE_LABELS], [ALARM_LABELS]])(
  'resolves state/alarm Y as linear for rendering and navigation',
  (categories) => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    model.x_log = true;
    model.y_log = true;
    const axes = buildPlotAxes(model, { categories });
    expect(axes.x.scale).toBe('logarithmic');
    expect(axes.x).not.toHaveProperty('categories');
    expect(axes.x).not.toHaveProperty('onYAxisWidth');
    expect(axes.y).toMatchObject({
      scale: 'linear',
      categories,
    });
  }
);

it('keeps bar X indices linear while preserving logarithmic Y settings', () => {
  const model = buildModelConfig(new DisplayVectorGraphModel());
  model.x_log = true;
  model.y_log = true;
  const axes = buildPlotAxes(model, { bar: true });
  expect(axes.x.scale).toBe('linear');
  expect(axes.x).not.toHaveProperty('beginAtZero');
  expect(axes.y).toMatchObject({ scale: 'logarithmic', beginAtZero: true });
});

afterEach(() => {
  Object.values(Chart.instances).forEach((chart) => chart.destroy());
  jest.restoreAllMocks();
});

function createChart(
  model: ReturnType<typeof buildModelConfig>,
  axes = buildPlotAxes(model)
) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 400;
  const drawing = new Proxy(
    {
      canvas,
      measureText: (text: string) => ({ width: String(text).length * 7 }),
    },
    { get: (target, key) => Reflect.get(target, key) ?? (() => undefined) }
  ) as unknown as CanvasRenderingContext2D;
  jest.spyOn(canvas, 'getContext').mockReturnValue(drawing);
  const config = commonChartOption(model, axes);
  // Use real scale generation, layout and resizing with a deterministic canvas
  // context; BasicPlatform avoids jsdom's missing browser resize observers.
  return new Chart(canvas, {
    ...config,
    options: { ...config.options, responsive: false },
    platform: BasicPlatform,
  });
}

it.each([false, true])(
  'keeps natural linear endpoints without forcing irregular boundaries (reverse=%s)',
  (reverse) => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    Object.assign(model, {
      x_autorange: false,
      y_autorange: false,
      x_min: 0,
      x_max: 10,
      y_min: 0,
      y_max: 10,
      x_invert: reverse,
      y_invert: reverse,
    });
    const chart = createChart(model);
    for (const key of ['x', 'y'] as const) {
      const values = chart.scales[key].ticks.map(({ value }) => value);
      expect(values).toContain(0);
      expect(values).toContain(10);
      Object.assign(chart.options.scales![key]!, { min: 0.3, max: 9.7 });
    }
    chart.update('none');
    for (const key of ['x', 'y'] as const) {
      const axis = chart.scales[key];
      const values = axis.ticks.map(({ value }) => value);
      expect([axis.min, axis.max]).toEqual([0.3, 9.7]);
      expect(values.length).toBeGreaterThan(0);
      expect(values).not.toContain(0.3);
      expect(values).not.toContain(9.7);
      expect(values.every((value) => value >= 0.3 && value <= 9.7)).toBe(true);
    }
  }
);

it.each([false, true])(
  'keeps centered time labels apart and inside the plot on resize (reverse=%s)',
  (reverse) => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    Object.assign(model, {
      x_autorange: false,
      x_min: new Date('2026-10-05T17:36:33').getTime() / 1000,
      x_max: new Date('2026-10-05T17:37:03').getTime() / 1000,
      x_invert: reverse,
      x_log: true,
    });
    const chart = createChart(model, buildPlotAxes(model, { timeX: true }));
    expect(chart.scales.x.type).toBe('linear');
    for (const width of [420, 240, 800]) {
      chart.resize(width, 400);
      expect(chart.options.scales!.x!.ticks!.align).toBe('center');
      const axis = chart.scales.x;
      expect(axis.labelRotation).toBe(0);
      expect(axis.ticks.length).toBeGreaterThan(0);
      const extents = axis.ticks
        .map(({ value, label }) => {
          const half = (String(label).length * 7) / 2;
          const position = axis.getPixelForValue(value);
          return [position - half, position + half];
        })
        .sort(([left], [right]) => left - right);
      extents.forEach(([left, right], index) => {
        expect(left).toBeGreaterThanOrEqual(chart.chartArea.left);
        expect(right).toBeLessThanOrEqual(chart.chartArea.right);
        if (index > 0) {
          expect(left - extents[index - 1][1]).toBeGreaterThanOrEqual(10);
        }
      });
      expect(axis.height).toBe(34);
    }
  }
);

it.each([false, true])(
  'labels log Y decades with superscripts and keeps minor ticks (reverse=%s)',
  (reverse) => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    Object.assign(model, {
      y_log: true,
      y_invert: reverse,
      y_autorange: false,
      y_min: 0.02,
      y_max: 2000,
    });
    const chart = createChart(model);
    const ticks = chart.scales.y.ticks;
    expect(
      ticks.filter(({ label }) => label !== '').map(({ label }) => label)
    ).toEqual(
      reverse
        ? ['10³', '10²', '10¹', '1', '10⁻¹']
        : ['10⁻¹', '1', '10¹', '10²', '10³']
    );
    expect(ticks.some(({ major, label }) => !major && label === '')).toBe(true);
    Object.assign(chart.options.scales!.y!, { min: 50.2, max: 51.8 });
    chart.update('none');
    expect(chart.scales.y.ticks.some(({ label }) => label !== '')).toBe(true);
    chart.scales.y.ticks.forEach(({ value, label }) => {
      expect(Number(label)).toBe(value);
    });
  }
);

it('preserves custom log Y formatting', () => {
  const model = buildModelConfig(new DisplayVectorGraphModel());
  const axes = buildPlotAxes(model);
  axes.y.scale = 'logarithmic';
  axes.y.range = [0.02, 2000];
  axes.y.formatTick = (value) => `value=${value}`;
  const chart = createChart(model, axes);
  expect(
    chart.scales.y.ticks.every(({ label }) =>
      String(label).startsWith('value=')
    )
  ).toBe(true);
});

const directions = [
  { xReverse: false, yReverse: false },
  { xReverse: true, yReverse: false },
  { xReverse: false, yReverse: true },
  { xReverse: true, yReverse: true },
];

describe.each([
  { xLog: false, yLog: false },
  { xLog: true, yLog: false },
  { xLog: false, yLog: true },
  { xLog: true, yLog: true },
])('real Chart.js (xLog=$xLog, yLog=$yLog)', ({ xLog, yLog }) => {
  it.each(directions)(
    'preserves ranges, horizontal labels and pixel direction (xReverse=$xReverse, yReverse=$yReverse)',
    ({ xReverse, yReverse }) => {
      const model = buildModelConfig(new DisplayVectorGraphModel());
      Object.assign(model, {
        x_log: xLog,
        y_log: yLog,
        x_invert: xReverse,
        y_invert: yReverse,
        x_autorange: false,
        y_autorange: false,
        x_min: 1,
        x_max: 1000,
        y_min: 1,
        y_max: 1000,
      });
      const chart = createChart(model);
      for (const [min, max] of [
        [1, 1000],
        [1.3, 937.7],
        [50.2, 51.8],
      ]) {
        for (const key of ['x', 'y'] as const) {
          Object.assign(chart.options.scales![key]!, { min, max });
        }
        chart.update('none');
        for (const key of ['x', 'y'] as const) {
          const axis = chart.scales[key];
          expect([axis.min, axis.max]).toEqual([min, max]);
          expect(axis.ticks.length).toBeGreaterThan(0);
          expect(
            axis.ticks.every(({ value }) => value >= min && value <= max)
          ).toBe(true);
          expect(chart.options.scales![key]!.ticks!.autoSkip).toBe(true);
          const delta = axis.getPixelForValue(max) - axis.getPixelForValue(min);
          expect(Math.sign(delta)).toBe(
            key === 'x' ? (xReverse ? -1 : 1) : yReverse ? 1 : -1
          );
          if ((key === 'x' ? xLog : yLog) && max === 1000) {
            expect(axis.ticks).toContainEqual(
              expect.objectContaining({ value: 10, major: true })
            );
          }
        }
        expect(chart.scales.x.labelRotation).toBe(0);
        expect(chart.scales.x.height).toBe(34);
        expect(chart.scales.y.width).toBe(52);
      }
    }
  );
});

it.each([false, true])(
  'adapts tick density on resize with stable titled gutters (log=%s)',
  (log) => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    Object.assign(model, {
      x_log: log,
      y_log: log,
      x_label: 'Position',
      x_units: 'm',
      y_label: 'Value',
      x_autorange: false,
      y_autorange: false,
      x_min: 1,
      x_max: 1e6,
      y_min: 1,
      y_max: 1e6,
    });
    const chart = createChart(model);
    const wide = chart.scales.x.ticks.length;
    chart.resize(240, 400);
    expect(chart.scales.x.ticks.length).toBeLessThan(wide);
    expect(chart.scales.x.labelRotation).toBe(0);
    expect(chart.scales.x.height).toBe(42);
    expect(chart.scales.y.width).toBe(68);
    expect(chart.options.scales!.x!.title!.text).toBe('Position (m)');
    const area = { ...chart.chartArea };
    for (const key of ['x', 'y'] as const) {
      Object.assign(chart.options.scales![key]!, { min: 0.001, max: 0.009 });
    }
    chart.update('none');
    expect(chart.chartArea).toEqual(area);
  }
);
