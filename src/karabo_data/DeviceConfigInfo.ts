import { Attributes, HashTypes } from "karabo-ts";
import { HashValueType } from "@/karabo_hash/HashValueType";
import { PropertySchemaAttributes } from "./DeviceSchemaInfo";

export interface DeviceConfigInfo {
  deviceId: string;
  properties: PropertyInfo[];
}

export interface PropertyInfo {
  key: string;
  value: HashValueType;
  type: HashTypes;
  timeAttrs: Attributes;
  schemaAttrs?: PropertySchemaAttributes;
}

export type PropertyInfoOptional = PropertyInfo | null | undefined;
