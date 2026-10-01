import type { ScriptableContext } from 'chart.js';
import type { ScatterGraphModel } from '@/karabo/common/api';
import { commonChartOption } from '../common/api';

export function scatterChartOption(model: ScatterGraphModel) {
  const config = commonChartOption(
    model,
    model.x_log,
    undefined,
    undefined,
    false,
    'scatter'
  );
  // Scatter samples may repeat X or arrive in any X order. Let Chart.js parse
  // them instead of promising sorted, normalized data to the controller.
  config.options!.parsing = {};
  config.options!.normalized = false;
  const color = (context: ScriptableContext<'scatter'>) =>
    context.dataIndex === context.dataset.data.length - 1 ? 'red' : 'blue';
  Object.assign(config.data.datasets[0], {
    showLine: false,
    pointRadius: model.psize / 2,
    pointHoverRadius: model.psize / 2,
    pointBorderWidth: 0,
    pointBackgroundColor: color,
    pointBorderColor: color,
  });
  return config;
}
