import type { DeviceSchema } from './SchemaType';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { DeviceInfo } from '@/karabo_data/TopologyInfo';
import { PropertyModel } from './PropertyType';

export type DeviceIdentity = Pick<
  DeviceInfo,
  'deviceId' | 'classId' | 'serverId' | 'host' | 'karaboVersion'
>;

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
  identity: DeviceIdentity;
  runtime: DeviceRuntimeState;
  schema: DeviceSchema;
  properties: Map<string, PropertyModel>;
}
