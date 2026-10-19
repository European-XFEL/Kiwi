import { ImageGraphModel, buildModelConfig } from '@/karabo/common/api';
import { drawImageDecorations, imageBounds } from '../decorations';
import { drawImageColorBar } from '../ImageColorBar';

function context() {
  const fillText = jest.fn();
  const createLinearGradient = jest.fn(() => ({ addColorStop: jest.fn() }));
  const ctx = new Proxy(
    { fillText, createLinearGradient, measureText: () => ({ width: 20 }) },
    {
      get: (target, key) =>
        key in target ? Reflect.get(target, key) : () => {},
    }
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, fillText, createLinearGradient };
}

test('transforms image axis coordinates and draws labels and scale independently of the colorbar', () => {
  const { ctx, fillText, createLinearGradient } = context();
  const model = new ImageGraphModel();
  model.x_label = 'Distance';
  model.x_units = 'mm';
  model.x_scale = 2;
  model.x_translate = 10;
  model.y_scale = -3;
  model.y_translate = 60;
  const bounds = imageBounds({ width: 800, height: 600 }, false);
  drawImageDecorations(ctx, {
    plotConfig: buildModelConfig(model),
    ranges: { x: [0, 100], y: [0, 100] },
    bounds,
  });
  expect(fillText).toHaveBeenCalledWith(
    'Distance (mm)',
    bounds.left + (bounds.right - bounds.left) / 2,
    12,
    bounds.right - bounds.left
  );
  expect(fillText.mock.calls.some(([label]) => label === 'x: 2 mm')).toBe(true);
  expect(createLinearGradient).not.toHaveBeenCalled();
  const yTick = fillText.mock.calls.find(
    ([label, x]) => label === '60' && x === bounds.left - 7
  );
  expect(yTick?.[2]).toBeCloseTo(bounds.top);
  const xTick = fillText.mock.calls.find(
    ([label, , y]) => label === '20' && y === bounds.top - 10
  );
  expect(xTick?.[1]).toBeCloseTo(
    bounds.left + (bounds.right - bounds.left) * 0.05
  );
});

test('honors show_scale without drawing a colorbar', () => {
  const { ctx, fillText, createLinearGradient } = context();
  const model = new ImageGraphModel();
  model.show_scale = false;
  drawImageDecorations(ctx, {
    plotConfig: buildModelConfig(model),
    ranges: { x: [0, 100], y: [0, 100] },
    bounds: imageBounds({ width: 800, height: 600 }, true),
  });
  expect(createLinearGradient).not.toHaveBeenCalled();
  expect(fillText.mock.calls.some(([label]) => label === 'Scale')).toBe(false);
});

test('draws units without a leading space when axis labels are empty', () => {
  const { ctx, fillText } = context();
  const model = new ImageGraphModel();
  model.x_label = '';
  model.y_label = '';
  model.x_units = 'mm';
  model.y_units = 's';
  const bounds = imageBounds({ width: 800, height: 600 }, true);
  drawImageDecorations(ctx, {
    plotConfig: buildModelConfig(model),
    ranges: { x: [0, 100], y: [0, 100] },
    bounds,
  });
  expect(fillText).toHaveBeenCalledWith('(mm)', 430, 12, 716);
  expect(fillText).toHaveBeenCalledWith('(s)', 0, 0, 528);
});

test('rebuilds the colorbar gradient and ticks with the latest levels on every draw', () => {
  const { ctx, fillText, createLinearGradient } = context();
  const args = {
    x: 726,
    top: 52,
    height: 528,
    colormap: 'viridis',
    limits: [0, 255] as [number, number],
  };
  drawImageColorBar(ctx, args);
  fillText.mockClear();
  args.limits = [10, 100];
  drawImageColorBar(ctx, args);
  expect(createLinearGradient).toHaveBeenCalledTimes(2);
  for (const result of createLinearGradient.mock.results) {
    expect(result.value.addColorStop).toHaveBeenCalledTimes(256);
  }
  expect(fillText).toHaveBeenCalledWith('10', 746, 580, 48);
  expect(fillText).toHaveBeenCalledWith('100', 746, 52, 48);
});
