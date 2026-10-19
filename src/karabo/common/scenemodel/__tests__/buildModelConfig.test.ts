import { buildModelConfig } from '../widgets/utils';
import {
  DisplayVectorGraphModel,
  VectorBarGraphModel,
  ScatterGraphModel,
  DisplayTrendGraphModel,
  buildModelConfig as buildSharedModelConfig,
  ImageGraphModel,
  WebCamGraphModel,
} from '../api';
test('exports the model configuration builder from the scene model API', () => {
  expect(buildSharedModelConfig).toBe(buildModelConfig);
});

test('excludes only base savable fields and copies all other settings', () => {
  const model = {
    x: 1,
    y: 2,
    width: 300,
    height: 200,
    keys: ['device.value'],
    parent_component: 'DisplayComponent',
    id: 'plot',
    klass: 'VectorGraph',
    title: 'Original',
    offset: 4,
    step: 0.5,
    x_log: true,
    simple_name: 'Plot',
    uuid: 'uuid',
    date: 'today',
    layout_data: {},
    roi_tool: 1,
    roi_items: ['legacy'],
    extra_setting: 42,
  };
  const settings = buildModelConfig(model);
  expect(Object.getPrototypeOf(settings)).toBe(Object.prototype);
  expect(settings).toEqual({
    title: 'Original',
    offset: 4,
    step: 0.5,
    x_log: true,
    simple_name: 'Plot',
    uuid: 'uuid',
    date: 'today',
    layout_data: {},
    roi_tool: 1,
    roi_items: ['legacy'],
    extra_setting: 42,
  });
  model.title = 'Changed';
  expect(settings.title).toBe('Original');
  settings.offset = 10;
  expect(model.offset).toBe(4);
});

test.each([
  new DisplayVectorGraphModel(),
  new VectorBarGraphModel(),
  new ScatterGraphModel(),
  new DisplayTrendGraphModel(),
])('copies settings without a plot-specific schema', (model) => {
  const settings = buildModelConfig(model);
  expect(settings.x_log).toBe(false);
  expect(settings).not.toHaveProperty('kind');
  expect(settings).not.toHaveProperty('klass');
  expect(settings).not.toBe(model);
  for (const [name, value] of Object.entries(model)) {
    if (
      ![
        'x',
        'y',
        'width',
        'height',
        'keys',
        'parent_component',
        'id',
        'klass',
      ].includes(name)
    )
      expect(settings[name]).toBe(value);
  }
});

test('keeps image rendering settings while excluding widget geometry and binding keys', () => {
  const model = new ImageGraphModel();
  model.x = 10;
  model.keys = ['CAMERA.image'];
  model.x_label = 'Distance';
  model.x_scale = 2;
  model.color_levels = [10, 200];
  const settings = buildModelConfig(model);
  expect(settings).toMatchObject({
    x_label: 'Distance',
    x_scale: 2,
    color_levels: [10, 200],
    colormap: model.colormap,
  });
  expect(settings).not.toHaveProperty('x');
  expect(settings).not.toHaveProperty('width');
  expect(settings).not.toHaveProperty('keys');
  expect(settings).not.toHaveProperty('klass');
  model.x_label = 'Changed';
  expect(settings.x_label).toBe('Distance');
});

test('supports the smaller webcam model without requiring image axes', () => {
  const model = new WebCamGraphModel();
  model.colormap = 'viridis';
  expect(buildModelConfig(model)).toMatchObject({ colormap: 'viridis' });
});
