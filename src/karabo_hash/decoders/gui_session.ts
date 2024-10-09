import {
  LoginInformationInfo,
  NotificationInfo,
} from "../../karabo_data/GuiProtocolSmallInfo";
import { GuiServerInfo } from "../../karabo_data/GuiServerInfo";
import { Hash } from "karabo-ts";

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
