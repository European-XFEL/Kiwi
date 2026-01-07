import { Hash, makeHash } from 'karabo-ts';
import { REQUEST_REPLY_TIMEOUT } from './const';

export const buildReconfigureHash = (
  deviceId: string,
  configuration: Hash
): Hash => {
  return makeHash({
    type: 'reconfigure',
    deviceId: deviceId,
    configuration: configuration,
    reply: true,
    timeout: REQUEST_REPLY_TIMEOUT,
  });
};
