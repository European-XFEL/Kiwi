import { render, screen } from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import {
  DisplayVectorGraphModel,
  VectorBarGraphModel,
} from '@/karabo/common/api';
import DisplayBarGraph from '../DisplayBarGraph';
import DisplayVectorGraph from '../DisplayVectorGraph';

it.each([
  ['line', <DisplayVectorGraph model={new DisplayVectorGraphModel()} />],
  ['bar', <DisplayBarGraph model={new VectorBarGraphModel()} />],
])('renders an empty %s chart without a proxy', (_, controller) => {
  render(controller);
  expect(screen.getByTestId('vector-chart')).toBeInTheDocument();
  const chart = (
    Chart as unknown as { instances: Chart<'line'>[] }
  ).instances.at(-1)!;
  expect(chart.data.datasets[0].data).toEqual([]);
  expect(screen.queryByText('Device offline')).not.toBeInTheDocument();
  expect(screen.queryByText('No vector data')).not.toBeInTheDocument();
});
