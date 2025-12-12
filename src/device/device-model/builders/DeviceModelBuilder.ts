import type { DeviceSchemaInfo } from '@/karabo_data/DeviceSchemaInfo';
import type { DeviceConfigInfo } from '@/karabo_data/DeviceConfigInfo';
import type { DeviceInfo } from '@/karabo_data/TopologyInfo';
import type { DeviceSchema, PropertySchema } from '../types/SchemaType';
import type {
  DeviceModel,
  DeviceIdentity,
  DeviceRuntimeState,
} from '../types/DeviceType';
import { ProxyStatus } from '@/device/enums';
import { buildPropertyMap } from './PropertyMapBuilder';

function buildDeviceSchema(info: DeviceSchemaInfo): DeviceSchema {
  return {
    deviceId: info.deviceId,
    properties: Array.from(info.propertyDescriptors.entries()).map(
      ([path, schemaAttrs]): PropertySchema => ({
        path,
        schemaAttrs,
      })
    ),
  };
}

function buildIdentity(deviceInfo: DeviceInfo): DeviceIdentity {
  return {
    deviceId: deviceInfo.deviceId,
    classId: deviceInfo.classId,
    serverId: deviceInfo.serverId,
    host: deviceInfo.host,
    karaboVersion: deviceInfo.karaboVersion,
  };
}

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

export function buildDeviceModel(
  schemaInfo: DeviceSchemaInfo,
  configInfo: DeviceConfigInfo,
  deviceInfo: DeviceInfo
): DeviceModel {
  const schema = buildDeviceSchema(schemaInfo);
  const identity = buildIdentity(deviceInfo);
  const runtime = buildInitialRuntimeState();

  // Use buildPropertyMap to create property models
  const properties = buildPropertyMap(schema, configInfo);

  // Extract state property if present
  for (const prop of configInfo.properties) {
    if (prop.key === 'state' && typeof prop.value === 'string') {
      runtime.state = prop.value;
      break;
    }
  }

  // We *know* we have schema + config now:
  runtime.hasSchema = true;
  runtime.hasConfig = true;

  return {
    identity,
    runtime,
    schema,
    properties,
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
