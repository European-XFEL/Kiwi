import {
  BasePlotModel,
  type BaseWidgetObjectData,
  DisplayAlarmGraphModel,
  DisplayStateGraphModel,
  DisplayTextLogModel,
  DisplayTrendGraphModel,
  DisplayVectorGraphModel,
  NDArrayGraphModel,
} from '@/karabo/common/api';
import {
  type BaseBinding,
  BoolBinding,
  DoubleBinding,
  FloatBinding,
  ImageBinding,
  Int8Binding,
  Int16Binding,
  Int32Binding,
  Int64Binding,
  UInt8Binding,
  UInt16Binding,
  UInt32Binding,
  UInt64Binding,
  StringBinding,
  NDArrayBinding,
  VectorBinding,
  VectorBoolBinding,
  VectorHashBinding,
  VectorStringBinding,
} from '@/lib/binding/api';

const scalarBindings = [
  BoolBinding,
  DoubleBinding,
  FloatBinding,
  Int8Binding,
  Int16Binding,
  Int32Binding,
  Int64Binding,
  UInt8Binding,
  UInt16Binding,
  UInt32Binding,
  UInt64Binding,
];

export function deriveControllerModel(
  binding: BaseBinding | undefined
): BaseWidgetObjectData | undefined {
  if (!binding || binding instanceof ImageBinding) {
    return undefined;
  }

  let derived: BaseWidgetObjectData;
  const scalar = scalarBindings.some((Binding) => binding instanceof Binding);
  if (scalar || binding instanceof StringBinding) {
    if (binding.displayType === 'State') {
      derived = new DisplayStateGraphModel();
    } else if (binding.displayType === 'AlarmCondition') {
      derived = new DisplayAlarmGraphModel();
    } else if (scalar) {
      derived = new DisplayTrendGraphModel();
    } else {
      derived = new DisplayTextLogModel();
    }
  } else if (binding instanceof NDArrayBinding) {
    derived = new NDArrayGraphModel();
  } else if (binding instanceof VectorBinding) {
    if (
      binding instanceof VectorBoolBinding ||
      binding instanceof VectorHashBinding ||
      binding instanceof VectorStringBinding
    ) {
      return undefined;
    }
    derived = new DisplayVectorGraphModel();
  } else {
    return undefined;
  }

  if (derived instanceof BasePlotModel) {
    derived.width = 600;
    derived.height = 350;
    derived.y_label = binding.displayedName;
    derived.y_units = binding.unit_label;
    derived.x_grid = true;
    derived.y_grid = true;
  } else {
    derived.width = 800;
    derived.height = 600;
  }
  return derived;
}
