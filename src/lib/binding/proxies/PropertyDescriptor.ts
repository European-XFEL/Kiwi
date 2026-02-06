import type { PropertyModel } from '@/lib/binding/model/types/PropertyType';
import type { PropertySchemaAttributes } from '@/karabo_data/DeviceSchemaInfo';
import {
  isPropertyEditable,
  type EditContext,
} from '@/lib/binding/model/editability';

export interface PropertyDescriptor {
  path: string;
  displayedName: string;
  description?: string;
  unitLabel?: string;
  schemaAttrs: PropertySchemaAttributes;
  isEditable: boolean;
}

export function buildPropertyDescriptor(
  model: PropertyModel,
  ctx: EditContext
): PropertyDescriptor {
  const { schema } = model;
  const schemaAttrs = schema.schemaAttrs;

  const { displayedName, description, unitSymbol, metricPrefixSymbol } =
    schemaAttrs;

  const unitLabel =
    `${metricPrefixSymbol ?? ''}${unitSymbol ?? ''}`.trim() || undefined;

  const isEditableFlag = isPropertyEditable(schemaAttrs, ctx);

  return {
    path: schema.path,
    displayedName: displayedName || schema.path,
    description,
    unitLabel,
    schemaAttrs,
    isEditable: isEditableFlag,
  };
}
