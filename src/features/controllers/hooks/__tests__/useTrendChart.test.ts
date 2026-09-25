import { init } from 'echarts';
import { DisplayTrendGraphModel } from '@/karabo/common/api';
import {
  fixedXRange,
  fixedYRange,
  formatValueTick,
  timeTickInterval,
  trendChartOption,
  trendPlotBounds,
} from '../trendChartConfig';

const series = [
  { key: 'A.value', timestamps: [1000, 2000], values: [1, 2] },
  { key: 'B.value', timestamps: [1000], values: [3] },
];

describe('trendChartOption', () => {
  it.each(['', 'Temperatures'])(
    'keeps rendered plot bounds fixed across value updates with title "%s"',
    (title) => {
      // SVG rendering uses ECharts' fallback text metrics without a canvas.
      const context = jest
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(null);
      const chart = init(null, undefined, {
        renderer: 'svg',
        ssr: true,
        width: 400,
        height: 240,
      });
      const model = new DisplayTrendGraphModel();
      model.title = title;
      const bounds = trendPlotBounds(400, 240, title);
      try {
        for (const maximum of [2, 1e20, 0.001, 200]) {
          chart.setOption(
            trendChartOption(
              model,
              [
                {
                  key: 'A.value',
                  timestamps: [1000, 2000],
                  values: [0, maximum],
                },
              ],
              [1000, 2000],
              [0, maximum]
            )
          );
          const topLeft = chart.convertToPixel({ gridIndex: 0 }, [
            1000,
            maximum,
          ]);
          const bottomRight = chart.convertToPixel({ gridIndex: 0 }, [2000, 0]);
          expect(topLeft[0]).toBeCloseTo(bounds.left);
          expect(topLeft[1]).toBeCloseTo(bounds.top);
          expect(bottomRight[0]).toBeCloseTo(bounds.right);
          expect(bottomRight[1]).toBeCloseTo(bounds.bottom);
        }
      } finally {
        chart.dispose();
        context.mockRestore();
      }
    }
  );

  it('configures line data, color rotation, markers, and the conditional legend', () => {
    const model = new DisplayTrendGraphModel();
    const option = trendChartOption(model, series);

    expect(option).toMatchObject({
      series: [
        {
          name: 'A.value',
          type: 'line',
          data: [
            [1000, 1],
            [2000, 2],
          ],
          color: '#009be5',
          connectNulls: true,
          showSymbol: true,
          symbol: 'circle',
        },
        { color: '#ff0040' },
      ],
      legend: {
        show: true,
        selectedMode: true,
        padding: 4,
        borderColor: '#000',
        borderWidth: 1,
      },
    });
    expect(trendChartOption(model, series.slice(0, 1))).toMatchObject({
      legend: { show: false },
    });
  });

  it('configures titles, units, grids, colors, and local time labels', () => {
    const model = new DisplayTrendGraphModel();
    model.title = 'Temperatures';
    model.x_label = 'Time';
    model.x_units = 's';
    model.y_units = 'K';
    model.x_grid = true;
    model.y_grid = true;
    const option = trendChartOption(model, series);

    expect(option).toMatchObject({
      title: { show: true, text: 'Temperatures' },
      grid: {
        show: true,
        left: 52,
        right: 2,
        top: 18,
        bottom: 34,
        containLabel: false,
        outerBoundsMode: 'none',
        backgroundColor: '#fff',
        borderColor: '#000',
        borderWidth: 1,
      },
      xAxis: {
        name: 'Time (s)',
        interval: undefined,
        splitLine: { show: true },
        axisLabel: {
          width: 64,
          overflow: 'truncate',
          hideOverlap: false,
          showMinLabel: false,
          showMaxLabel: false,
        },
      },
      yAxis: {
        name: '(K)',
        splitLine: { show: true },
        axisLabel: { width: 36, overflow: 'truncate' },
      },
      backgroundColor: 'transparent',
      animation: false,
    });
    const date = new Date(2026, 0, 2, 13, 45);
    const timeAxis = option.xAxis as {
      axisLabel: { formatter: (value: number) => string };
    };
    expect(timeAxis.axisLabel.formatter(date.getTime())).toBe(
      new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    );
    const wideRange = trendChartOption(model, series, [
      date.getTime(),
      date.getTime() + 2 * 24 * 60 * 60_000,
    ]);
    const dateAxis = wideRange.xAxis as typeof timeAxis;
    expect(dateAxis.axisLabel.formatter(date.getTime())).toBe(
      new Intl.DateTimeFormat().format(date)
    );
  });

  it('applies fixed ranges, autorange, logarithmic Y, and inversions', () => {
    const model = new DisplayTrendGraphModel();
    model.x_autorange = false;
    model.x_min = 1;
    model.x_max = 4;
    model.y_autorange = false;
    model.y_min = 0.1;
    model.y_max = 100;
    model.x_invert = true;
    model.y_invert = true;
    model.y_log = true;

    expect(fixedXRange(model)).toEqual([1000, 4000]);
    expect(fixedYRange(model)).toEqual([0.1, 100]);
    const option = trendChartOption(
      model,
      series,
      fixedXRange(model),
      fixedYRange(model)
    );
    expect(option).toMatchObject({
      xAxis: { min: 1000, max: 4000, inverse: true },
      yAxis: {
        min: 0.1,
        max: 100,
        inverse: true,
        type: 'log',
      },
    });

    model.x_autorange = true;
    model.y_autorange = true;
    expect(fixedXRange(model)).toBeUndefined();
    expect(fixedYRange(model)).toBeUndefined();
  });

  it.each([
    [1, '1'],
    [1.2, '1.2'],
    [1.234, '1.23'],
    [0.001234, '1.23e-3'],
    [1e9, '1e+9'],
  ])('formats the numeric tick %s as %s', (value, expected) => {
    expect(formatValueTick(value)).toBe(expected);
  });

  it.each([
    [[0, 10 * 60_000], 2 * 60_000],
    [[0, 60 * 60_000], 15 * 60_000],
    [[0, 24 * 60 * 60_000], 6 * 60 * 60_000],
    [[0, 7 * 24 * 60 * 60_000], 2 * 24 * 60 * 60_000],
  ] as const)(
    'uses a stable interval for the time range %s',
    (range, expected) => {
      expect(timeTickInterval([...range])).toBe(expected);
    }
  );
});
