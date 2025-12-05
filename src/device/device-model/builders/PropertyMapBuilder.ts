import type { DeviceSchema, PropertySchema } from "../types/SchemaType";
import type { DeviceConfigInfo } from "@/karabo_data/DeviceConfigInfo";
import type { PropertyModel } from "../types/PropertyType";
import { buildPropertyModel } from "./PropertyModelBuilder";

/**
 * Build a Map<string, PropertyModel> for a whole device.
 * Key is the property path (e.g. "name", "frequency", "channels").
 *
 * If config is not provided, creates models for all schema properties with undefined values.
 * If config is provided, creates models for all schema properties and merges in config values.
 */
export function buildPropertyMap(
  schema: DeviceSchema,
  config?: DeviceConfigInfo
): Map<string, PropertyModel> {
  const properties = new Map<string, PropertyModel>();

  // First, create models for ALL schema properties (with undefined values)
  for (const propSchema of schema.properties) {
    const model = buildPropertyModel(propSchema);
    properties.set(propSchema.path, model);
  }

  // Then, if config is provided, update models with actual config values
  if (config) {
    const schemaByPath = new Map<string, PropertySchema>(
      schema.properties.map((p) => [p.path, p])
    );

    for (const propInfo of config.properties) {
      const propSchema = schemaByPath.get(propInfo.key);
      if (!propSchema) {
        // Skip schema-less properties
        continue;
      }

      const model = properties.get(propSchema.path);
      if (model) {
        model.value = propInfo.value;
        model.type = propInfo.type;
        model.timeAttrs = propInfo.timeAttrs;
      }
    }
  }

  return properties;
}
