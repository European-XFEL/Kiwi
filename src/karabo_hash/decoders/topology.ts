import {
  SystemTopologyInfo,
  DeviceInfo,
  DeviceServerInfo,
  SystemTopologyUpdateInfo,
  MacroInfo,
} from '../../karabo_data/TopologyInfo';
import { Hash } from '@/karabo-hash/hash';

function extractDeviceInstanceInfos(devicesHash: Hash): DeviceInfo[] {
  const deviceInstInfos: DeviceInfo[] = [];
  // devicesHash is a hash where each key is a deviceId string and
  // each value is a HashNode containing the device instance info as attributes.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [deviceId, _, attrs] of devicesHash.iterall()) {
    deviceInstInfos.push({
      deviceId: deviceId,
      heartbeatInterval: attrs.getValue('heartbeatInterval') as number,
      karaboVersion: attrs.getValue('karaboVersion') as string,
      classId: attrs.getValue('classId') as string,
      serverId: attrs.getValue('serverId') as string,
      host: attrs.getValue('host') as string,
      status: attrs.getValue('status') as string,
      capabilities: attrs.getValue('capabilities') as number,
    });
  }
  return deviceInstInfos;
}

function extractServerInstanceInfos(serversHash: Hash): DeviceServerInfo[] {
  const serverInstInfos: DeviceServerInfo[] = [];
  // serversHashValue is a HashValue where each key is a instanceId string and
  // each value is a HashNode containing the server instance info as attributes.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [instanceId, _, attrs] of serversHash.iterall()) {
    serverInstInfos.push({
      serverId: instanceId,
      heartbeatInterval: attrs.getValue('heartbeatInterval') as number,
      karaboVersion: attrs.getValue('karaboVersion') as string,
      version: attrs.getValue('version') as string,
      host: attrs.getValue('host') as string,
      lang: attrs.getValue('lang') as string,
      log: attrs.getValue('log') as string,
      serverFlags: attrs.has('serverFlags')
        ? (attrs.getValue('serverFlags') as number)
        : undefined,
      capabilities: attrs.has('capabilities')
        ? (attrs.getValue('capabilities') as number)
        : undefined,
      frac: attrs.has('frac') ? (attrs.getValue('frac') as number) : undefined,
      sec: attrs.has('sec') ? (attrs.getValue('sec') as number) : undefined,
      tid: attrs.has('tid') ? (attrs.getValue('tid') as number) : undefined,
    });
  }

  return serverInstInfos;
}

function extractMacroInfos(macrosHash: Hash): MacroInfo[] {
  const macroInfos: MacroInfo[] = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [macroId, _, attrs] of macrosHash.iterall()) {
    macroInfos.push({
      deviceId: macroId,
      heartbeatInterval: attrs.getValue('heartbeatInterval') as number,
      karaboVersion: attrs.getValue('karaboVersion') as string,
      classId: attrs.getValue('classId') as string,
      serverId: attrs.getValue('serverId') as string,
      host: attrs.getValue('host') as string,
      status: attrs.getValue('status') as string,
      capabilities: attrs.getValue('capabilities') as number,
      module: attrs.getValue('module') as string,
      project: attrs.getValue('project') as string,
    });
  }

  return macroInfos;
}

export const sysTopologyInfoFromHash = (hash: Hash): SystemTopologyInfo => {
  // Gather info on devices
  const devices = extractDeviceInstanceInfos(
    hash.getValue('systemTopology.device') as Hash
  );
  // Gather info on device servers
  const servers = extractServerInstanceInfos(
    hash.getValue('systemTopology.server') as Hash
  );
  const macros = extractMacroInfos(
    hash.getValue('systemTopology.macro') as Hash
  );
  // Gather info on macros
  return {
    devices: devices,
    servers: servers,
    macros: macros,
  };
};

export const sysTopologyUpdateInfoFromHash = (
  hash: Hash
): SystemTopologyUpdateInfo => {
  const newHashDevices = hash.getValue('changes.new.device') as Hash;
  const newHashServers = hash.getValue('changes.new.server') as Hash;
  const newHashMacros = hash.getValue('changes.new.macro') as Hash;
  const newDevices =
    newHashDevices !== undefined
      ? extractDeviceInstanceInfos(newHashDevices)
      : [];
  const newServers =
    newHashServers !== undefined
      ? extractServerInstanceInfos(newHashServers)
      : [];
  const newMacros =
    newHashMacros !== undefined ? extractMacroInfos(newHashMacros) : [];

  const updatedHashDevices = hash.getValue('changes.update.device') as Hash;
  const updatedHashServers = hash.getValue('changes.update.server') as Hash;
  const updatedHashMacros = hash.getValue('changes.update.macro') as Hash;
  const updatedDevices =
    updatedHashDevices !== undefined
      ? extractDeviceInstanceInfos(updatedHashDevices)
      : [];
  const updatedServers =
    updatedHashServers !== undefined
      ? extractServerInstanceInfos(updatedHashServers)
      : [];
  const updatedMacros =
    updatedHashMacros !== undefined ? extractMacroInfos(updatedHashMacros) : [];

  const goneHashDevices = hash.getValue('changes.gone.device') as Hash;
  const goneHashServers = hash.getValue('changes.gone.server') as Hash;
  const goneHashMacros = hash.getValue('changes.gone.macro') as Hash;
  const goneDevices =
    goneHashDevices !== undefined
      ? extractDeviceInstanceInfos(goneHashDevices)
      : [];
  const goneServers =
    goneHashServers !== undefined
      ? extractServerInstanceInfos(goneHashServers)
      : [];
  const goneMacros =
    goneHashMacros !== undefined ? extractMacroInfos(goneHashMacros) : [];

  return {
    new: {
      devices: newDevices,
      servers: newServers,
      macros: newMacros,
    },
    update: {
      devices: updatedDevices,
      servers: updatedServers,
      macros: updatedMacros,
    },
    gone: {
      devices: goneDevices,
      servers: goneServers,
      macros: goneMacros,
    },
  };
};
