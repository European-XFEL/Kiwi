import {
  SystemTopologyInfo,
  DeviceInfo,
  DeviceServerInfo,
} from "../../karabo_data/TopologyInfo";
import { Hash } from "karabo-ts";

export const sysTopologyInfoFromHash = (hash: Hash): SystemTopologyInfo => {
  // Gather info on devices
  const devices: DeviceInfo[] = [];
  // TODO: devise a way to get rid of the hacky "as unknown as Hash" castings below.
  //       Probably use generics for the KaraboType value_ (currently any). The
  //       sequence "as unknown as Hash" is a workaround for the type checks done by
  //       the Typescript compiler.
  const sysTopology = hash.value.systemTopology.value as unknown as Hash;
  const deviceHash = sysTopology.value.device.value as unknown as Hash;
  // devices.value is a Hash where each key is a deviceId string and each
  // value is a Hash containing the device instance info as attributes.
  for (const deviceId in deviceHash.value) {
    const deviceNode = deviceHash.value[deviceId];
    const deviceAttrs = deviceNode.attrs;
    devices.push({
      deviceId: deviceId,
      heartbeatInterval: deviceAttrs["heartbeatInterval"].value_ as number,
      karaboVersion: deviceAttrs["karaboVersion"].value_ as string,
      classId: deviceAttrs["classId"].value_ as string,
      serverId: deviceAttrs["serverId"].value_ as string,
      visibility: deviceAttrs["visibility"].value_ as number,
      host: deviceAttrs["host"].value_ as string,
      status: deviceAttrs["status"].value_ as string,
      capabilities: deviceAttrs["capabilities"].value_ as number,
      frac: deviceAttrs["frac"]
        ? (deviceAttrs["frac"].value_ as number)
        : undefined,
      sec: deviceAttrs["sec"]
        ? (deviceAttrs["sec"].value_ as number)
        : undefined,
      tid: deviceAttrs["tid"]
        ? (deviceAttrs["tid"].value_ as number)
        : undefined,
    });
  }
  // Gather info on device servers
  const servers: DeviceServerInfo[] = [];
  const serverHash = sysTopology.value.server.value as unknown as Hash;
  // devices.value is a Hash where each key is a deviceId string and each
  // value is a Hash containing the device instance info as attributes.
  for (const deviceId in serverHash.value) {
    const serverNode = serverHash.value[deviceId];
    const serverAttrs = serverNode.attrs;
    servers.push({
      serverId: deviceId,
      heartbeatInterval: serverAttrs["heartbeatInterval"].value_ as number,
      karaboVersion: serverAttrs["karaboVersion"].value_ as string,
      version: serverAttrs["version"].value_ as string,
      visibility: serverAttrs["visibility"].value_ as number,
      host: serverAttrs["host"].value_ as string,
      lang: serverAttrs["lang"].value_ as string,
      log: serverAttrs["log"].value_ as string,
      serverFlags: serverAttrs["serverFlags"]
        ? (serverAttrs["serverFlags"].value_ as number)
        : undefined,
      capabilities: serverAttrs["capabilities"]
        ? (serverAttrs["capabilities"].value_ as number)
        : undefined,
      frac: serverAttrs["frac"]
        ? (serverAttrs["frac"].value_ as number)
        : undefined,
      sec: serverAttrs["sec"]
        ? (serverAttrs["sec"].value_ as number)
        : undefined,
      tid: serverAttrs["tid"]
        ? (serverAttrs["tid"].value_ as number)
        : undefined,
    });
  }

  return {
    devices: devices,
    servers: servers,
  };
};
