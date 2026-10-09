import type { PlotSettings } from './buildModelConfig';
import { TRACE_COLORS } from './constants';

export function resolveCurveStyle({
  key,
  index,
  plotConfig,
}: {
  key: string;
  index: number;
  plotConfig: PlotSettings;
}) {
  const option = plotConfig.curve_options?.find((option) => option.key === key);
  return {
    label: option?.name ?? key,
    color:
      option?.pen_color.trim() || TRACE_COLORS[index % TRACE_COLORS.length],
  };
}
