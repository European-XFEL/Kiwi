import {
  SystemTopologyInfo,
  DeviceInfo,
  DeviceServerInfo,
} from "../../karabo_data/TopologyInfo";
import { Hash, HashValue } from "karabo-ts";

export const sysTopologyInfoFromHash = (hash: Hash): SystemTopologyInfo => {
  // Gather info on devices
  const devices: DeviceInfo[] = [];
  const deviceHash = hash.getValue("systemTopology.device") as HashValue;
  // devices.deviceHash is a HashValue where each key is a deviceId string and
  // each value is a HashNode containing the device instance info as attributes.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [deviceId, _, attrs] of new Hash(deviceHash).iterall()) {
    devices.push({
      deviceId: deviceId,
      heartbeatInterval: attrs["heartbeatInterval"] as number,
      karaboVersion: attrs["karaboVersion"] as string,
      classId: attrs["classId"] as string,
      serverId: attrs["serverId"] as string,
      visibility: attrs["visibility"] as number,
      host: attrs["host"] as string,
      status: attrs["status"] as string,
      capabilities: attrs["capabilities"] as number,
      frac: attrs["frac"]
        ? (attrs["frac"] as number)
        : undefined,
      sec: attrs["sec"]
        ? (attrs["sec"] as number)
        : undefined,
      tid: attrs["tid"]
        ? (attrs["tid"] as number)
        : undefined,
    });
  }
  // Gather info on device servers
  const servers: DeviceServerInfo[] = [];
  const serverHash = hash.getValue("systemTopology.server") as HashValue;
  // serverHash is a HashValue where each key is a instanceId string and
  // each value is a HashNode containing the server instance info as attributes.

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [instanceId, _, attrs] of new Hash(serverHash).iterall()) {
    servers.push({
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
      frac: attrs["frac"]
        ? (attrs["frac"] as number)
        : undefined,
      sec: attrs["sec"]
        ? (attrs["sec"] as number)
        : undefined,
      tid: attrs["tid"]
        ? (attrs["tid"] as number)
        : undefined,
    });
  }

  return {
    devices: devices,
    servers: servers,
  };
};
