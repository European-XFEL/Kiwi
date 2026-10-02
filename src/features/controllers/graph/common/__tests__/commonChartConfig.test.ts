import { buildModelConfig } from '../../common/api';
import {
  DisplayTrendGraphModel,
  DisplayVectorGraphModel,
  VectorBarGraphModel,
} from '@/karabo/common/api';
import { barChartOption, vectorChartOption } from '../../plot/api';
import { trendChartOption } from '../../trend/api';

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
    const y = { width: 100 };
    scales.x!.afterFit!(x as never);
    scales.y!.afterFit!(y as never);
    expect(x.height).toBe(34);
    expect(y.width).toBe(52);
    const formatTick = scales.y!.ticks!.callback as (value: number) => string;
    expect(formatTick(1.234)).toBe('1.23');
    expect(config.plugins?.[0]?.id).toBe('kiwiPlotFrame');
  }
);
