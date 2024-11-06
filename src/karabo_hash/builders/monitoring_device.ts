import { Hash, makeHash } from "karabo-ts";

export const buildStartMonitoringHash = (deviceId: string): Hash => {
  return makeHash({
    type: "startMonitoringDevice",
    deviceId: deviceId,
  });
};

export const buildStopMonitoringHash = (deviceId: string): Hash => {
  return makeHash({
    type: "stopMonitoringDevice",
    deviceId: deviceId,
  });
};
