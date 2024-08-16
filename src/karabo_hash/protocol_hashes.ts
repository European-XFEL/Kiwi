import { Hash, HashTypes, HashValue } from "./types";

import {
  DeviceInfo,
  DeviceServerInfo,
  SystemTopologyInfo,
} from "../karabo_data/TopologyInfo";

import { GuiServerInfo } from "../karabo_data/GuiServerInfo";

import {
  LoginInformationInfo,
  NotificationInfo,
} from "../karabo_data/GuiProtocolSmallInfo";

import BinaryDecoder from "./bin_reader";

/**
 * Parses a Blob, the type of WebSocketEvent.data, supposed to contain a
 * binary serialized hash.
 * @param blob the Blob to be parsed
 * @returns the Hash that was binary serialized in the input Blob.
 */
export const blobToHash = async (blob: Blob): Promise<Hash> => {
  // The Blob has to be converted to an ArrayBuffer
  // and then to an Uint8Array to be fed to the Hash binary decoder.
  // The first 4 bytes are the size in bytes of the Hash binary image
  // and must not be fed into the decoder.
  const arrBuff = await blob.arrayBuffer();
  const buffData = new Uint8Array(arrBuff.slice(4));
  const hashDecoder = new BinaryDecoder(buffData);
  const hash = hashDecoder.read();
  return hash;
};

/**
 * Return the value of a given hash's "type" property.
 *
 * @param hash the hash whose "type" property value should be returned.
 * @returns the value of the hash's "type" property (blank if the hash has no type property).
 */
export const hashProtocolType = (hash: Hash): string => {
  let typeValue = "";
  if ("type" in hash.value) {
    typeValue = hash.value.type.value.value_ as string;
  }
  return typeValue;
};

export const guiServerInfoFromHash = (hash: Hash): GuiServerInfo => {
  return {
    deviceId: hash.value.deviceId.value.value_ as string,
    hostname: hash.value.hostname.value.value_ as string,
    hostport: parseInt(hash.value.hostport.value.value_),
    authRequired:
      "authServer" in hash.value &&
      (hash.value.authServer.value.value_ as string).length > 0,
    authServer: hash.value.authServer.value.value_ as string,
    readOnly: hash.value.readOnly.value.value_ as boolean,
    topic: hash.value.topic.value.value_ as string,
    version: hash.value.version.value.value_ as string,
  };
};

export const loginInfoFromHash = (hash: Hash): LoginInformationInfo => {
  return {
    accessLevel: hash.value.accessLevel.value.value_ as number,
  };
};

export const notificationInfoFromHash = (hash: Hash): NotificationInfo => {
  return {
    message: hash.value.message.value.value_ as string,
  };
};

export const sysTopologyInfoFromHash = (hash: Hash): SystemTopologyInfo => {
  // Gather info on devices
  let devices: DeviceInfo[] = [];
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
  let servers: DeviceServerInfo[] = [];
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

export const buildLoginHash = (
  clientId: string,
  version: string,
  oneTimeToken?: string,
  clientUserId?: string
): Hash => {
  const hashVal: HashValue = {};

  hashVal.type = {
    value: { type_: HashTypes.String, value_: "login" },
    attrs: {},
  };
  hashVal.clientId = {
    value: { type_: HashTypes.String, value_: clientId },
    attrs: {},
  };
  hashVal.version = {
    value: { type_: HashTypes.String, value_: version },
    attrs: {},
  };
  if (oneTimeToken) {
    hashVal.oneTimeToken = {
      value: { type_: HashTypes.String, value_: oneTimeToken },
      attrs: {},
    };
  }
  if (clientUserId) {
    hashVal.clientUserId = {
      value: { type_: HashTypes.String, value_: clientUserId },
      attrs: {},
    };
  }

  return new Hash(hashVal);
};

/**
 * Adds a size prefix to a binary serialized Hash.
 * @param encodedHash the binary serialized Hash whose size should be added as
 * a prefix.
 * @returns an array buffer consisting of the input array buffer plus a 4 bytes
 * prefix with the size of the input binary serialized Hash.
 */
export const packEncodedHash = (encodedHash: ArrayBuffer): ArrayBuffer => {
  const encodedHashView = new Uint8Array(encodedHash);
  const packedBuff = new ArrayBuffer(encodedHash.byteLength + 4);
  const packedBuffView = new DataView(packedBuff);
  packedBuffView.setUint32(0, encodedHash.byteLength, true);
  for (let i = 4; i < packedBuff.byteLength; i++) {
    packedBuffView.setUint8(i, encodedHashView[i - 4]);
  }
  return packedBuff;
};
