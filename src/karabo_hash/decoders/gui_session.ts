import {
  LoginInformationInfo,
  NotificationInfo,
} from '../../karabo_data/GuiProtocolSmallInfo';
import { GuiServerInfo } from '../../karabo_data/GuiServerInfo';
import { Hash } from '@/karabo-hash/hash';

export const guiServerInfoFromHash = (hash: Hash): GuiServerInfo => {
  return {
    deviceId: hash.getValue('deviceId') as string,
    hostname: hash.getValue('hostname') as string,
    hostport: parseInt(hash.getValue('hostport') as string),
    authRequired: !!hash.getValue('authServer'),
    authServer: hash.getValue('authServer') as string,
    readOnly: hash.getValue('readOnly') as boolean,
    topic: hash.getValue('topic') as string,
    version: hash.getValue('version') as string,
  };
};

export const loginInfoFromHash = (hash: Hash): LoginInformationInfo => {
  return {
    accessLevel: hash.getValue('accessLevel') as number,
  };
};

export const notificationInfoFromHash = (hash: Hash): NotificationInfo => {
  return {
    message: hash.getValue('message') as string,
  };
};
