import type { DeviceSchema, PropertySchema } from '../types/SchemaType';
import type { DeviceConfigInfo } from '@/karabo_data/DeviceConfigInfo';
import type { PropertyModel } from '../types/PropertyType';
import { buildPropertyModel } from './PropertyModelBuilder';

/**
 * Build a Map<string, PropertyModel> for a whole device.
 */
export function buildPropertyMap(
  schema: DeviceSchema,
  config?: DeviceConfigInfo
): Map<string, PropertyModel> {
  const properties = new Map<string, PropertyModel>();

  //create models for ALL schema properties (with undefined values)
  for (const propSchema of schema.properties) {
    const model = buildPropertyModel(propSchema);
    properties.set(propSchema.path, model);
  }
  if (config) {
    const schemaByPath = new Map<string, PropertySchema>(
      schema.properties.map((p) => [p.path, p])
    );

    for (const propInfo of config.properties) {
      const propSchema = schemaByPath.get(propInfo.key);
      if (!propSchema) {
        continue;
      }

      const model = properties.get(propSchema.path);
      if (model) {
        model.binding.value = propInfo.value;
        model.binding.type = propInfo.type;
        model.binding.timeAttrs = propInfo.timeAttrs;
        model.binding.info = propInfo;
      }
    }
  }

  return properties;
}
