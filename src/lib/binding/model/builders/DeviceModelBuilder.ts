import type { DeviceModel, DeviceRuntimeState } from '../types/DeviceType';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';

function buildInitialRuntimeState(): DeviceRuntimeState {
  return {
    state: undefined,
    proxyStatus: ProxyStatus.UNKNOWN,
    isOnline: false,
    hasSchema: false,
    hasConfig: false,
    hasReceivedTopology: false,
    propertySubscriberCount: 0,
  };
}

export function buildEmptyDeviceModel(deviceId: string): DeviceModel {
  return {
    identity: {
      deviceId,
      classId: undefined,
      serverId: undefined,
      host: undefined,
      karaboVersion: undefined,
    },
    runtime: buildInitialRuntimeState(),
    schema: {
      deviceId,
      properties: [],
    },
    properties: new Map(),
  };
}
