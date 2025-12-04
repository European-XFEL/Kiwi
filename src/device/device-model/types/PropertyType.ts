import type { HashValueType } from "@/karabo_hash/HashValueType";
import type { Attributes, HashTypes } from "karabo-ts";
import type { PropertySchema } from "./SchemaType";

export interface PropertyModel {
  property_schema: PropertySchema;
  value: HashValueType | undefined;
  type: HashTypes | undefined;
  timeAttrs: Attributes | undefined;
}
