import { BasicPlatform, Chart, registerables } from 'chart.js';
import {
  DisplayVectorGraphModel,
  VectorBarGraphModel,
} from '@/karabo/common/api';
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

it('uses bar model axis settings without overrides', () => {
  const model = buildModelConfig(new VectorBarGraphModel());
  model.y_log = true;
  const axes = buildPlotAxes(model);
  expect(axes.x.scale).toBe('linear');
  expect(axes.y.scale).toBe('logarithmic');
});

afterEach(() => {
  Object.values(Chart.instances).forEach((chart) => chart.destroy());
  jest.restoreAllMocks();
});

function createChart(
  model: ReturnType<typeof buildModelConfig>,
  axes = buildPlotAxes(model),
  characterWidth = 7
) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 400;
  const drawing = new Proxy(
    {
      canvas,
      measureText: (text: string) => ({
        width: String(text).length * characterWidth,
      }),
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

function visibleXLabels(chart: Chart) {
  return chart.scales.x
    .getLabelItems()
    .filter(({ label }) => label !== '')
    .map(({ label, font, options }) => {
      chart.ctx.font = font.string;
      const width = chart.ctx.measureText(String(label)).width;
      const position = options.translation![0];
      let left = position;
      if (options.textAlign === 'right') {
        left -= width;
      } else if (options.textAlign === 'center') {
        left -= width / 2;
      }
      return { label, left, right: left + width };
    })
    .sort((a, b) => a.left - b.left);
}

function expectXLabelSpacing(chart: Chart) {
  const labels = visibleXLabels(chart);
  labels.forEach(({ left, right }, index) => {
    expect(left).toBeGreaterThanOrEqual(chart.chartArea.left);
    expect(right).toBeLessThanOrEqual(chart.chartArea.right);
    if (index > 0) {
      expect(left - labels[index - 1].right).toBeGreaterThanOrEqual(2);
    }
  });
  return labels;
}

it.each([false, true])(
  'centers numeric X labels and hides edge labels without removing ticks (reverse=%s)',
  (reverse) => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    Object.assign(model, {
      x_autorange: false,
      x_min: 0,
      x_max: 20000,
      x_invert: reverse,
      x_grid: true,
    });
    const chart = createChart(model, buildPlotAxes(model), 6);
    chart.resize(499, 400);
    expect(chart.chartArea.width).toBe(433);
    const area = { ...chart.chartArea };
    const labels = expectXLabelSpacing(chart);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.map(({ label }) => label)).not.toContain('0');
    expect(labels.map(({ label }) => label)).not.toContain('20000');
    const axis = chart.scales.x;
    expect(chart.options.scales!.x!.ticks!.align).toBe('center');
    expect(
      axis
        .getLabelItems()
        .every(({ options }) => options.textAlign === 'center')
    ).toBe(true);
    expect(axis.ticks.map(({ value }) => value)).toEqual(
      expect.arrayContaining([0, 20000])
    );
    const hidden = axis.getLabelItems().findIndex(({ label }) => label === '');
    expect(hidden).toBeGreaterThanOrEqual(0);
    expect(axis.ticks[hidden].label).not.toBe('');
    // Suppression changes text drawing only; the hidden tick still draws its
    // gridline and tick mark at the same X position.
    const moveTo = jest.spyOn(chart.ctx, 'moveTo');
    axis.drawGrid(chart.chartArea);
    const pixel = axis.getPixelForTick(hidden);
    expect(
      moveTo.mock.calls.filter(([x]) => Math.abs(x - pixel) <= 1).length
    ).toBeGreaterThanOrEqual(2);

    for (const [min, max] of [
      [10000, 20000],
      [0.001, 0.009],
      [0, 20000],
    ]) {
      Object.assign(chart.options.scales!.x!, { min, max });
      chart.update('none');
      expectXLabelSpacing(chart);
      expect(chart.chartArea).toEqual(area);
    }
    chart.resize(240, 400);
    const narrow = expectXLabelSpacing(chart).length;
    chart.resize(800, 400);
    expectXLabelSpacing(chart);
    expect(visibleXLabels(chart).length).toBeGreaterThan(narrow);
  }
);

it.each([false, true])(
  'retains every fitting interior X label from axes3.png (reverse=%s)',
  (reverse) => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    Object.assign(model, {
      x_autorange: false,
      x_min: 0,
      x_max: 20000,
      x_invert: reverse,
    });
    const chart = createChart(model);
    chart.resize(499, 400);
    const labels = expectXLabelSpacing(chart).map(({ label }) => label);
    const expected = Array.from({ length: 9 }, (_, index) =>
      String((index + 1) * 2000)
    );
    expect(labels).toEqual(reverse ? expected.reverse() : expected);
  }
);

it.each([false, true])(
  'keeps logarithmic X labels apart through zoom and resize (reverse=%s)',
  (reverse) => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    Object.assign(model, {
      x_log: true,
      x_invert: reverse,
      x_autorange: false,
      x_min: 1,
      x_max: 1000,
    });
    const chart = createChart(model);
    for (const width of [487, 240, 800]) {
      chart.resize(width, 400);
      const labels = expectXLabelSpacing(chart);
      expect(labels.length).toBeGreaterThan(0);
      expect(
        chart.scales.x
          .getLabelItems()
          .every(({ options }) => options.textAlign === 'center')
      ).toBe(true);
    }
    Object.assign(chart.options.scales!.x!, { min: 50.2, max: 51.8 });
    chart.update('none');
    expectXLabelSpacing(chart);
  }
);

it.each([false, true])(
  'hides numeric X labels that cannot fit in narrow plots (reverse=%s)',
  (reverse) => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    Object.assign(model, {
      x_autorange: false,
      x_min: 10000,
      x_max: 20000,
      x_invert: reverse,
    });
    const chart = createChart(model);
    // Keep natural endpoints to exercise widths below Chart.js autoSkip's
    // usual minimum tick spacing.
    chart.options.scales!.x!.ticks!.autoSkip = false;
    chart.resize(122, 400);
    const labels = expectXLabelSpacing(chart);
    expect(labels.map(({ label }) => label)).not.toContain('10000');
    expect(labels.map(({ label }) => label)).not.toContain('20000');
    chart.resize(92, 400);
    expect(expectXLabelSpacing(chart)).toEqual([]);
    chart.resize(800, 400);
    expect(expectXLabelSpacing(chart).length).toBeGreaterThan(1);
  }
);

it('handles empty and single numeric X labels', () => {
  const model = buildModelConfig(new DisplayVectorGraphModel());
  Object.assign(model, { x_autorange: false, x_min: 0, x_max: 10 });
  const chart = createChart(model);
  chart.options.scales!.x!.afterBuildTicks = (axis) => {
    axis.ticks = [];
  };
  chart.update('none');
  expect(expectXLabelSpacing(chart)).toEqual([]);
  chart.options.scales!.x!.afterBuildTicks = (axis) => {
    axis.ticks = [{ value: 5 }];
  };
  chart.update('none');
  expect(expectXLabelSpacing(chart).map(({ label }) => label)).toEqual(['5']);
});

it.each(['', 'ndarray'])(
  'fits full Y tick labels from axes2.png with title "%s"',
  (title) => {
    const model = buildModelConfig(new DisplayVectorGraphModel());
    Object.assign(model, {
      y_autorange: false,
      y_min: 850000,
      y_max: 1250000,
      y_label: title,
    });
    const chart = createChart(model);
    const axis = chart.scales.y;
    axis.getLabelItems().forEach(({ label, font, options }) => {
      chart.ctx.font = font.string;
      const width = chart.ctx.measureText(String(label)).width;
      const left = options.translation![0] - width;
      const titleWidth = title ? Number(font.lineHeight) : 0;
      expect(left).toBeGreaterThanOrEqual(axis.left + titleWidth);
    });
    const area = { ...chart.chartArea };
    for (const [min, max] of [
      [0, 10],
      [850000, 1250000],
      [-1250000, -850000],
    ]) {
      Object.assign(chart.options.scales!.y!, { min, max });
      chart.update('none');
      expect(chart.chartArea).toEqual(area);
    }
    chart.resize(240, 400);
    expect(chart.scales.y.width).toBe(area.left);
  }
);

it('retains an expanded Y gutter when longer labels later become shorter', () => {
  const model = buildModelConfig(new DisplayVectorGraphModel());
  Object.assign(model, {
    y_autorange: false,
    y_min: 123456789.1,
    y_max: 123456789.2,
  });
  const chart = createChart(model);
  const gutter = chart.scales.y.width;
  expect(gutter).toBeGreaterThan(80);
  Object.assign(chart.options.scales!.y!, { min: 0, max: 10 });
  chart.update('none');
  expect(chart.scales.y.width).toBe(gutter);
});

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
        expect(chart.scales.y.width).toBe(64);
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
    expect(chart.scales.y.width).toBeGreaterThanOrEqual(80);
    expect(chart.options.scales!.x!.title!.text).toBe('Position (m)');
    const area = { ...chart.chartArea };
    for (const key of ['x', 'y'] as const) {
      Object.assign(chart.options.scales![key]!, { min: 0.001, max: 0.009 });
    }
    chart.update('none');
    expect(chart.chartArea).toEqual(area);
  }
);
