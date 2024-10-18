import {
  SystemTopologyInfo,
  DeviceInfo,
  DeviceServerInfo,
  SystemTopologyUpdateInfo,
} from "../../karabo_data/TopologyInfo";
import { Hash, HashValue } from "karabo-ts";

function extractDeviceInstanceInfos(devicesHashValue: HashValue): DeviceInfo[] {
  const deviceInstInfos: DeviceInfo[] = [];
  // devicesHashValue is a HashValue where each key is a deviceId string and
  // each value is a HashNode containing the device instance info as attributes.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [deviceId, _, attrs] of new Hash(devicesHashValue).iterall()) {
    deviceInstInfos.push({
      deviceId: deviceId,
      heartbeatInterval: attrs["heartbeatInterval"] as number,
      karaboVersion: attrs["karaboVersion"] as string,
      classId: attrs["classId"] as string,
      serverId: attrs["serverId"] as string,
      visibility: attrs["visibility"] as number,
      host: attrs["host"] as string,
      status: attrs["status"] as string,
      capabilities: attrs["capabilities"] as number,
      frac: attrs["frac"] ? (attrs["frac"] as number) : undefined,
      sec: attrs["sec"] ? (attrs["sec"] as number) : undefined,
      tid: attrs["tid"] ? (attrs["tid"] as number) : undefined,
    });
  }
  return deviceInstInfos;
}

function extractServerInstanceInfos(
  serversHashValue: HashValue
): DeviceServerInfo[] {
  const serverInstInfos: DeviceServerInfo[] = [];
  // serversHashValue is a HashValue where each key is a instanceId string and
  // each value is a HashNode containing the server instance info as attributes.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [instanceId, _, attrs] of new Hash(serversHashValue).iterall()) {
    serverInstInfos.push({
      serverId: instanceId,
      heartbeatInterval: attrs["heartbeatInterval"] as number,
      karaboVersion: attrs["karaboVersion"] as string,
      version: attrs["version"] as string,
      visibility: attrs["visibility"] as number,
      host: attrs["host"] as string,
      lang: attrs["lang"] as string,
      log: attrs["log"] as string,
      serverFlags: attrs["serverFlags"]
        ? (attrs["serverFlags"] as number)
        : undefined,
      capabilities: attrs["capabilities"]
        ? (attrs["capabilities"] as number)
        : undefined,
      frac: attrs["frac"] ? (attrs["frac"] as number) : undefined,
      sec: attrs["sec"] ? (attrs["sec"] as number) : undefined,
      tid: attrs["tid"] ? (attrs["tid"] as number) : undefined,
    });
  }

  return serverInstInfos;
}

export const sysTopologyInfoFromHash = (hash: Hash): SystemTopologyInfo => {
  // Gather info on devices
  const devices = extractDeviceInstanceInfos(
    hash.getValue("systemTopology.device") as HashValue
  );
  // Gather info on device servers
  const servers = extractServerInstanceInfos(
    hash.getValue("systemTopology.server") as HashValue
  );
  return {
    devices: devices,
    servers: servers,
  };
};

export const sysTopologyUpdateInfoFromHash = (
  hash: Hash
): SystemTopologyUpdateInfo => {
  const newHashDevices = hash.getValue("changes.new.device") as HashValue;
  const newHashServers = hash.getValue("changes.new.server") as HashValue;
  const newDevices =
    newHashDevices !== undefined
      ? extractDeviceInstanceInfos(newHashDevices)
      : [];
  const newServers =
    newHashServers !== undefined
      ? extractServerInstanceInfos(newHashServers)
      : [];

  const updatedHashDevices = hash.getValue(
    "changes.update.device"
  ) as HashValue;
  const updatedHashServers = hash.getValue(
    "changes.update.server"
  ) as HashValue;
  const updatedDevices =
    updatedHashDevices !== undefined
      ? extractDeviceInstanceInfos(updatedHashDevices)
      : [];
  const updatedServers =
    updatedHashServers !== undefined
      ? extractServerInstanceInfos(updatedHashServers)
      : [];

  const goneHashDevices = hash.getValue("changes.gone.device") as HashValue;
  const goneHashServers = hash.getValue("changes.gone.server") as HashValue;
  const goneDevices =
    goneHashDevices !== undefined
      ? extractDeviceInstanceInfos(goneHashDevices)
      : [];
  const goneServers =
    goneHashServers !== undefined
      ? extractServerInstanceInfos(goneHashServers)
      : [];

  return {
    new: {
      devices: newDevices,
      servers: newServers,
    },
    update: {
      devices: updatedDevices,
      servers: updatedServers,
    },
    gone: {
      devices: goneDevices,
      servers: goneServers,
    },
  };
};
