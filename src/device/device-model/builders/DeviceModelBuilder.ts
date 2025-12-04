import type { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";
import type { DeviceConfigInfo } from "@/karabo_data/DeviceConfigInfo";
import type { DeviceInfo } from "@/karabo_data/TopologyInfo";
import type { DeviceSchema, PropertySchema } from "../types/SchemaType";
import type {
  DeviceModel,
  DeviceIdentity,
  DeviceRuntimeState,
} from "../types/DeviceType";
import type { PropertyModel } from "../types/PropertyType";
import { ProxyStatus } from "@/device/enums";

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

  const schemaByPath = new Map(schema.properties.map((p) => [p.path, p]));
  const properties = new Map<string, PropertyModel>();

  // First, create models for ALL schema properties (with undefined values)
  for (const propSchema of schema.properties) {
    const model: PropertyModel = {
      property_schema: propSchema,
      value: undefined,
      type: undefined,
      timeAttrs: undefined,
    };
    properties.set(propSchema.path, model);
  }

  // Then, update models with actual config values
  for (const prop of configInfo.properties) {
    const propSchema = schemaByPath.get(prop.key);
    if (!propSchema) continue; // schema-less props - skip

    const model = properties.get(propSchema.path);
    if (model) {
      model.value = prop.value;
      model.type = prop.type;
      model.timeAttrs = prop.timeAttrs;
    }

    // If this is the "state" property, update runtime.state
    if (prop.key === "state" && typeof prop.value === "string") {
      runtime.state = prop.value;
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
