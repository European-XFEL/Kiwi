import { Hash, makeHash } from 'karabo-ts';

export const buildExecuteCommandHash = (
  deviceId: string,
  command: string
): Hash => {
  return makeHash({
    type: 'execute',
    deviceId: deviceId,
    command: command,
  });
};
