import type { DeviceSchema } from './SchemaType';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { PropertyModel } from './PropertyType';

export interface DeviceRuntimeState {
  state?: string; // Karabo "state" property value
  proxyStatus: ProxyStatus;
  isOnline: boolean;
  hasSchema: boolean;
  hasConfig: boolean;
  hasReceivedTopology: boolean;
  propertySubscriberCount: number;
}

export interface DeviceModel {
  identity: any;
  runtime: DeviceRuntimeState;
  schema: DeviceSchema;
  properties: Map<string, PropertyModel>;
}
