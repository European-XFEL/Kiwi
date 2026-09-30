import type { ChartConfiguration } from 'chart.js';

type Range = { min: number; max: number };

export class Chart {
  static instances: Chart[] = [];
  chartArea = {
    left: 52,
    right: 198,
    top: 2,
    bottom: 166,
    width: 146,
    height: 164,
  };
  scales: Record<'x' | 'y', Range> = {
    x: { min: 0, max: 1 },
    y: { min: 0, max: 1 },
  };
  data: ChartConfiguration<'line'>['data'];
  options: NonNullable<ChartConfiguration<'line'>['options']>;
  datasetReferences: ChartConfiguration<'line'>['data']['datasets'] = [];
  visibility = new Map<number, boolean>();
  isDatasetVisible = jest.fn(
    (index: number) =>
      this.visibility.get(index) ?? !this.data.datasets[index]?.hidden
  );
  setDatasetVisibility = jest.fn((index: number, visible: boolean) => {
    this.visibility.set(index, visible);
  });
  destroy = jest.fn();
  update = jest.fn(() => {
    this.data.datasets.forEach((dataset, index) => {
      if (this.datasetReferences[index] !== dataset)
        this.visibility.delete(index);
    });
    this.datasetReferences = [...this.data.datasets];
    for (const key of ['x', 'y'] as const) {
      const axis = this.options.scales?.[key];
      const values = this.data.datasets
        .filter((_, index) => this.isDatasetVisible(index))
        .flatMap((dataset) =>
          dataset.data.map((point) =>
            typeof point === 'object' && point !== null
              ? Number(point[key])
              : NaN
          )
        )
        .filter(Number.isFinite);
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 1;
      this.scales[key] = {
        min:
          typeof axis?.min === 'number'
            ? axis.min
            : min === max
              ? min - 1
              : min,
        max:
          typeof axis?.max === 'number'
            ? axis.max
            : min === max
              ? max + 1
              : max,
      };
    }
  });

  constructor(_canvas: HTMLCanvasElement, config: ChartConfiguration<'line'>) {
    this.data = config.data;
    this.options = config.options ?? {};
    Chart.instances.push(this);
    this.update();
  }
}
