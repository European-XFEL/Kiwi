import { DisplayVectorGraphModel } from '@/karabo/common/api';
import { vectorChartOption } from '../vectorChartConfig';

describe('vectorChartOption', () => {
  it('uses model axis labels and units without inventing fallback labels', () => {
    const model = new DisplayVectorGraphModel();
    model.x_label = 'Position';
    model.x_units = 'mm';
    model.y_label = 'Intensity';
    model.y_units = 'counts';

    expect(vectorChartOption(model, [4], [2])).toMatchObject({
      xAxis: { name: 'Position (mm)' },
      yAxis: { name: 'Intensity (counts)' },
      series: [{ data: [[2, 4]] }],
    });

    model.x_label = '';
    model.x_units = '';
    model.y_label = '';
    model.y_units = '';

    expect(vectorChartOption(model, [], [])).toMatchObject({
      xAxis: { name: '' },
      yAxis: { name: '' },
    });
  });
});
