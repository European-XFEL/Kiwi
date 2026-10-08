import { buildModelConfig } from '../../common/api';
import {
  DisplayTrendGraphModel,
  DisplayVectorGraphModel,
  VectorBarGraphModel,
} from '@/karabo/common/api';
import { vectorChartOption, barChartOption } from '../../plotConfig';
import { trendChartOption } from '../../trend/api';
import { buildPlotAxes, commonChartOption, integerTickFormatter } from '../api';

it('pairs adaptive time ticks with mapped numeric Y labels and numeric fallbacks', () => {
  const model = buildModelConfig(new DisplayTrendGraphModel());
  Object.assign(model, {
    x_autorange: false,
    x_min: 1,
    x_max: 4,
    y_autorange: false,
    y_min: 0,
    y_max: 1,
  });
  const axes = buildPlotAxes(model, { timeX: true });
  axes.y.formatTick = integerTickFormatter(
    new Map([
      [0, 'Off'],
      [1, 'On'],
      [0.5, 'ignored'],
    ])
  );
  const scales = commonChartOption(model, axes).options!.scales!;
  expect(scales.x).toMatchObject({ type: 'linear', min: 1000, max: 4000 });
  expect(scales.x!.afterBuildTicks).toEqual(expect.any(Function));
  expect(scales.y).toMatchObject({ type: 'linear', min: 0, max: 1 });
  const format = scales.y!.ticks!.callback as (value: number) => string;
  expect(format(0)).toBe('Off');
  expect(format(1)).toBe('On');
  expect(format(2)).toBe('2');
  expect(format(0.5)).toBe('0.5');
  expect(format(0.001234)).toBe('0.001234');
});

it.each([
  [
    'trend',
    () => trendChartOption(buildModelConfig(new DisplayTrendGraphModel()), []),
  ],
  [
    'vector line',
    () => vectorChartOption(buildModelConfig(new DisplayVectorGraphModel())),
  ],
  ['bar', () => barChartOption(buildModelConfig(new VectorBarGraphModel()))],
])(
  'shares frame, numeric Y ticks, and fixed gutters for %s',
  (_, configure) => {
    const config = configure();
    const scales = config.options!.scales!;
    const x = { height: 100 };
    const y = { width: 30 };
    scales.x!.afterFit!(x as never);
    scales.y!.afterFit!(y as never);
    expect(x.height).toBe(34);
    expect(y.width).toBe(64);
    const formatTick = scales.y!.ticks!.callback!;
    expect(formatTick.call({} as never, 1.234, 0, [{ value: 1.234 }])).toBe(
      '1.234'
    );
    expect(config.plugins?.[0]?.id).toBe('kiwiPlotFrame');
  }
);
