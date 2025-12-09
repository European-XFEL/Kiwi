import type { HashValueType } from "@/karabo_hash/HashValueType";
import type { Attributes, HashTypes } from "karabo-ts";
import type { PropertySchema } from "./SchemaType";
import { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";

export interface PropertyModel {
  property_schema: PropertySchema;
  value: HashValueType | undefined;
  type: HashTypes | undefined;
  timeAttrs: Attributes | undefined;

  /**
   *Single source of truth snapshot from backend/config layer.
   * This is the last PropertyInfo we used to update this model.
   */
  info?: PropertyInfoOptional;
}
