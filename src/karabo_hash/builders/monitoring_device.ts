import { Hash } from '@/karabo-hash/hash';

export const buildStartMonitoringHash = (deviceId: string): Hash => {
  return new Hash({
    type: 'startMonitoringDevice',
    deviceId: deviceId,
  });
};

export const buildStopMonitoringHash = (deviceId: string): Hash => {
  return new Hash({
    type: 'stopMonitoringDevice',
    deviceId: deviceId,
  });
};

export const buildGetDeviceSchemaHash = (deviceId: string): Hash => {
  return new Hash({
    type: 'getDeviceSchema',
    deviceId: deviceId,
  });
};
