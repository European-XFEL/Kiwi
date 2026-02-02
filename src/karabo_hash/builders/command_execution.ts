import { Hash } from '@/karabo-hash/hash';

export const buildExecuteCommandHash = (
  deviceId: string,
  command: string
): Hash => {
  return new Hash({
    type: 'execute',
    deviceId: deviceId,
    command: command,
  });
};
