import { HashTypes } from "karabo-ts";
import { HashValueType } from "@/karabo_hash/HashValueType";
import {
  AccessLevel,
  AccessMode,
  ArchivePolicy,
  Assignment,
  Encoding,
} from "@/karabo_data/SchemaEnums";

export interface DeviceSchemaInfo {
  deviceId: string;
  propertyDescriptors: Map<string, PropertyAttributes>;
}

export interface PropertyAttributes {
  valueType: HashTypes;
  defaultValue: HashValueType;
  displayedName: string;
  description?: string;
  requiredAccessLevel: AccessLevel;
  accessMode: AccessMode;
  archivePolicy?: ArchivePolicy;
  assignment?: Assignment;
  unitSymbol?: string;
  metricPrefixSymbol?: string;
  encoding?: Encoding;
}
