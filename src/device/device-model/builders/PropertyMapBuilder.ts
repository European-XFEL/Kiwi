import type { DeviceSchema, PropertySchema } from "../types/SchemaType";
import type { DeviceConfigInfo } from "@/karabo_data/DeviceConfigInfo";
import type { PropertyModel } from "../types/PropertyType";
import { buildPropertyModel } from "./PropertyModelBuilder";

/**
 * Build a Map<string, PropertyModel> for a whole device.
 * Key is the property path (e.g. "name", "frequency", "channels").
 */
export function buildPropertyMap(
  schema: DeviceSchema,
  config: DeviceConfigInfo
): Map<string, PropertyModel> {
  const properties = new Map<string, PropertyModel>();

  const schemaByPath = new Map<string, PropertySchema>(
    schema.properties.map((p) => [p.path, p])
  );

  for (const propInfo of config.properties) {
    const propSchema = schemaByPath.get(propInfo.key);
    if (!propSchema) {
      // Option: skip schema-less properties, or create a minimal schema wrapper
      continue;
    }

    const model = buildPropertyModel(propSchema, propInfo);
    properties.set(propSchema.path, model);
  }

  return properties;
}
