import type { PropertySchemaAttributes } from '@/karabo_data/DeviceSchemaInfo';

export interface PropertySchema {
  /** Full property path, e.g. "name", "frequency", "channels" */
  path: string;

  /** Raw schema attributes from Karabo */
  schemaAttrs: PropertySchemaAttributes;
}

export interface DeviceSchema {
  properties: PropertySchema[];
}
