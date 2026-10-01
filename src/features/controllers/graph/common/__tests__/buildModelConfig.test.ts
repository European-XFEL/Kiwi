import {
  DisplayVectorGraphModel,
  VectorBarGraphModel,
  ScatterGraphModel,
  DisplayTrendGraphModel,
} from '@/karabo/common/api';
import { buildModelConfig } from '../api';

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
