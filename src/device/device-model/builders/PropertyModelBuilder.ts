import type { PropertySchema } from "../types/SchemaType";
import type { PropertyModel } from "../types/PropertyType";
import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";

/**
 * Build a PropertyModel from:
 * - schema (PropertySchema)
 * - config/value (PropertyInfo) - optional
 *
 * If config is not provided, creates a model with undefined values.
 */
export function buildPropertyModel(
  schema: PropertySchema,
  config?: PropertyInfo
): PropertyModel {
  // Optional: small safety check
  // if (config && schema.path !== config.key) {
  //   console.warn(`Schema path (${schema.path}) != config key (${config.key})`);
  // }

  return {
    property_schema: schema,
    value: config?.value,
    type: config?.type,
    timeAttrs: config?.timeAttrs,
  };
}
