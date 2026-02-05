import { HashTypes } from '@/karabo-hash/typenums';
import { SimpleValueTypes, ValueTypes } from '@/karabo-hash/types';
import {
  AccessLevel,
  AccessMode,
  ArchivePolicy,
  Assignment,
  NodeType,
} from '@/karabo_data/SchemaEnums';

export interface DeviceSchemaInfo {
  propertyDescriptors: Map<string, PropertySchemaAttributes>;
}

export interface TableColumnInfo {
  columnName: string;
  columnAttributes: PropertySchemaAttributes;
}

export interface PropertySchemaAttributes {
  valueType: HashTypes;
  defaultValue?: ValueTypes;
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
  options?: SimpleValueTypes[];
  allowedStates?: string[];
  rowSchema?: TableColumnInfo[];

  // for decimal precision control
  decimalPlaces?: number; // Number of decimal places for floating-point display
}
