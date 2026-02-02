import { HashTypes } from '@/karabo-hash/typenums';
import { HashAttributes, HashValues } from '@/karabo-hash/hash';
import { PropertySchemaAttributes } from './DeviceSchemaInfo';

export interface DeviceConfigInfo {
  deviceId: string;
  properties: PropertyInfo[];
}

export interface PropertyInfo {
  key: string;
  value: HashValues;
  type: HashTypes;
  timeAttrs: HashAttributes;
  schemaAttrs?: PropertySchemaAttributes;
}

export type PropertyInfoOptional = PropertyInfo | null | undefined;
