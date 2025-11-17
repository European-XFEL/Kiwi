import { HashTypes } from "karabo-ts";
import { HashValueType, VectorElementType } from "@/karabo_hash/HashValueType";
import {
  AccessLevel,
  AccessMode,
  ArchivePolicy,
  Assignment,
  NodeType,
} from "@/karabo_data/SchemaEnums";

export interface DeviceSchemaInfo {
  deviceId: string;
  propertyDescriptors: Map<string, PropertySchemaAttributes>;
}

export interface TableColumnInfo {
  columnName: string;
  columnAttributes: PropertySchemaAttributes;
}

export interface PropertySchemaAttributes {
  valueType: HashTypes;
  defaultValue?: HashValueType;
  // displayType serves as a "guide" for the GUI client for displaying the
  // property. Usual values for it: "Slot", "ImageData", "NDArray", "OutputSchema"
  displayType?: string;
  displayedName?: string;
  description?: string;
  requiredAccessLevel?: AccessLevel;
  accessMode?: AccessMode;
  archivePolicy?: ArchivePolicy;
  assignment?: Assignment;
  unitSymbol?: string;
  metricPrefixSymbol?: string;
  nodeType?: NodeType;
  options?: VectorElementType[];
  allowedStates?: string[];
  rowSchema?: TableColumnInfo[];
}
