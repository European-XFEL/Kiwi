import {
  DisplayTextLogModel,
  DisplayTrendGraphModel,
  DisplayStateGraphModel,
  DisplayAlarmGraphModel,
  DisplayVectorGraphModel,
  NDArrayGraphModel,
} from '@/karabo/common/api';
import {
  BaseBinding,
  BoolBinding,
  DoubleBinding,
  Int32Binding,
  StringBinding,
  VectorBinding,
  VectorBoolBinding,
  VectorDoubleBinding,
  VectorStringBinding,
  VectorHashBinding,
  NDArrayBinding,
  ImageBinding,
  NodeBinding,
} from '@/lib/binding/api';
import { deriveControllerModel } from '../deriveControllerModel';

describe('deriveControllerModel', () => {
  it.each([
    [new BoolBinding(), DisplayTrendGraphModel],
    [new DoubleBinding(), DisplayTrendGraphModel],
    [new Int32Binding(), DisplayTrendGraphModel],
    [new StringBinding(), DisplayTextLogModel],
    [new VectorDoubleBinding(), DisplayVectorGraphModel],
    [
      new VectorBinding({ value: new Float64Array([1, 2]) }),
      DisplayVectorGraphModel,
    ],
    [new NDArrayBinding(), NDArrayGraphModel],
  ])('derives a fresh renderer from %s', (binding, Model) => {
    const derived = deriveControllerModel(binding);
    expect(derived).toBeInstanceOf(Model);
    expect(derived).not.toBe(deriveControllerModel(binding));
    expect(derived?.keys).toEqual([]);
    let size = { width: 600, height: 350 };
    if (Model === DisplayTextLogModel) {
      size = { width: 800, height: 600 };
    }
    expect(derived?.width).toBe(size.width);
    expect(derived?.height).toBe(size.height);
  });

  it.each([
    ['State', DisplayStateGraphModel],
    ['AlarmCondition', DisplayAlarmGraphModel],
  ])('gives the %s display hint precedence over scalar type', (hint, Model) => {
    const binding = new StringBinding();
    binding.displayType = hint;
    expect(deriveControllerModel(binding)).toBeInstanceOf(Model);
  });

  it('copies property labels and units and enables graph grids', () => {
    const binding = new DoubleBinding();
    binding.displayedName = 'Temperature';
    binding.unit_label = 'K';
    const derived = deriveControllerModel(binding) as DisplayTrendGraphModel;
    expect(derived.y_label).toBe('Temperature');
    expect(derived.y_units).toBe('K');
    expect(derived.x_grid).toBe(true);
    expect(derived.y_grid).toBe(true);
  });

  it.each([
    undefined,
    new BaseBinding(),
    new NodeBinding(),
    new VectorStringBinding(),
    new VectorHashBinding(),
    new VectorBoolBinding(),
    new ImageBinding(),
  ])('ignores missing and unsupported bindings %s', (binding) => {
    expect(deriveControllerModel(binding)).toBeUndefined();
  });
});
