import { TrendModel, CategoricalTrendModel } from '../trendmodel';

it.each([TrendModel, CategoricalTrendModel])(
  'removes all live points before the history end (%p)',
  (Model) => {
    const model = new Model();
    model.addPoint(10, 1);
    model.addPoint(20, 2);
    expect(
      model.setHistory({ timestamps: [5, 25], values: [8, 9] }, [0, 26])
    ).toBe(true);
    expect(model.view()).toEqual({
      timestamps: [5, 25],
      values: [8, 9],
    });
    model.addPoint(30, 3);
    expect(model.view()).toEqual({
      timestamps: [5, 25, 30],
      values: [8, 9, 3],
    });
  }
);

it.each([TrendModel, CategoricalTrendModel])(
  'replaces history and preserves remaining live points (%p)',
  (Model) => {
    const model = new Model();
    model.addPoint(10, 1);
    model.addPoint(20, 2);
    model.addPoint(30, 3);
    model.setHistory({ timestamps: [5, 25], values: [8, 9] }, [0, 26]);
    expect(model.view()).toEqual({
      timestamps: [5, 25, 30],
      values: [8, 9, 3],
    });
    model.setHistory({ timestamps: [1, 15], values: [4, 5] }, [0, 26]);
    expect(model.view()).toEqual({
      timestamps: [1, 15, 30],
      values: [4, 5, 3],
    });
    model.addPoint(40, 6);
    expect(model.view().values).toEqual([4, 5, 3, 6]);
    expect(model.setHistory({ timestamps: [], values: [] }, [0, 26])).toBe(
      false
    );
    expect(model.view().values).toEqual([4, 5, 3, 6]);
  }
);

it.each([TrendModel, CategoricalTrendModel])(
  'keeps a history window separate from bounded live storage (%p)',
  (Model) => {
    const model = new Model();
    for (let i = 0; i < 2000; i++) model.addPoint(i, i % 4);
    model.setHistory({ timestamps: [0, 1500], values: [0, 3] }, [0, 1]);
    expect(model.view().timestamps).toContain(1999);
    expect(
      model
        .view()
        .timestamps.slice(2)
        .every((t) => t >= 1500)
    ).toBe(true);
    for (let i = 2000; i < 10000; i++) model.addPoint(i, i % 4);
    const data = model.view();
    expect(data.timestamps.slice(0, 2)).toEqual([0, 1500]);
    expect(data.timestamps.slice(2).every((t) => t >= 1500)).toBe(true);
    expect(data.timestamps.length).toBeLessThanOrEqual(902);
    expect(data.timestamps).toEqual([...data.timestamps].sort((a, b) => a - b));
    if (Model === CategoricalTrendModel) {
      expect(data.values.every(Number.isInteger)).toBe(true);
    }
  }
);

describe.each([TrendModel, CategoricalTrendModel])(
  'Python history acceptance (%p)',
  (Model) => {
    it.each([
      {
        name: 'fewer points with unchanged coverage',
        current: [10, 20, 30, 40, 50, 60, 70, 80, 90],
        history: [10, 50, 90],
        accepted: false,
      },
      {
        name: 'fewer points expanding incomplete coverage',
        current: [10, 20, 30, 40, 50, 60, 70, 80, 90],
        history: [0, 50, 99],
        accepted: true,
      },
      {
        name: 'fewer points when existing coverage exceeds 90 percent',
        current: [0, 50, 99],
        history: [0, 99.5],
        accepted: false,
      },
      {
        name: 'fewer points when existing coverage is exactly 90 percent',
        current: [0, 45, 90],
        history: [0, 99],
        accepted: false,
      },
      {
        name: 'equal point counts with narrower coverage',
        current: [10, 50, 90],
        history: [20, 50, 80],
        accepted: true,
      },
      {
        name: 'end boundary excluded from interval counts',
        current: [0, 25, 50, 75, 100],
        history: [0, 20, 40, 60],
        accepted: true,
      },
      {
        name: 'one history point against multiple live points',
        current: [10, 20, 30],
        history: [20],
        accepted: false,
      },
      {
        name: 'no previous data',
        current: [],
        history: [10, 20],
        accepted: true,
      },
    ])('$name', ({ current, history, accepted }) => {
      const model = new Model();
      for (const timestamp of current) model.addPoint(timestamp, 1);
      const before = [...model.view().timestamps];
      expect(
        model.setHistory(
          { timestamps: history, values: history.map(() => 2) },
          [0, 100]
        )
      ).toBe(accepted);
      if (accepted) {
        expect(model.view().timestamps.slice(0, history.length)).toEqual(
          history
        );
        expect(model.view().values.slice(0, history.length)).toEqual(
          history.map(() => 2)
        );
      } else {
        expect(model.view().timestamps).toEqual(before);
        expect(model.view().values).toEqual(current.map(() => 1));
      }
    });

    it('ignores a zero-width interval', () => {
      const model = new Model();
      model.addPoint(10, 1);
      expect(model.setHistory({ timestamps: [5], values: [2] }, [10, 10])).toBe(
        false
      );
      expect(model.view()).toEqual({ timestamps: [10], values: [1] });
    });

    it('retains the generation point exactly at the history end, like searchsorted', () => {
      const model = new Model();
      model.addPoint(10, 1);
      model.addPoint(20, 2);
      model.addPoint(30, 3);
      model.setHistory({ timestamps: [5, 20], values: [8, 9] }, [0, 20]);
      expect(model.view()).toEqual({
        timestamps: [5, 20, 20, 30],
        values: [8, 9, 2, 3],
      });
    });
  }
);

it.each([TrendModel, CategoricalTrendModel])(
  'purges live and historic storage and accepts fresh samples (%p)',
  (Model) => {
    const model = new Model();
    model.addPoint(30, 3);
    model.setHistory({ timestamps: [10, 20], values: [1, 2] }, [0, 25]);
    model.purge();
    expect(model.view()).toEqual({ timestamps: [], values: [] });
    model.purge();
    model.addPoint(15, 4);
    expect(model.view()).toEqual({ timestamps: [15], values: [4] });
    expect(
      model.setHistory({ timestamps: [5, 10], values: [8, 9] }, [0, 12])
    ).toBe(true);
    expect(model.view()).toEqual({
      timestamps: [5, 10, 15],
      values: [8, 9, 4],
    });
  }
);

it('purges every numeric generation before subsequent rebuilds', () => {
  const model = new TrendModel();
  for (let i = 0; i < 10000; i++) {
    model.addPoint(i, -1);
  }
  model.purge();
  for (let i = 0; i < 2000; i++) {
    model.addPoint(i, 4);
  }
  expect(model.view().values.length).toBeGreaterThan(200);
  expect(model.view().values.every((value) => value === 4)).toBe(true);
  expect(model.view().timestamps.at(-1)).toBe(1999);
});
