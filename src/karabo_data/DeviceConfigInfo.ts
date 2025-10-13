import { Attributes, HashTypes } from "karabo-ts";
import { HashValueType } from "@/karabo_hash/HashValueType";

export interface DeviceConfigInfo {
  deviceId: string;
  properties: PropertyInfo[];
}

export interface PropertyInfo {
  propertyId: string;
  propertyValue: HashValueType;
  propertyType: HashTypes;
  propertyAttrs: Attributes;
}
