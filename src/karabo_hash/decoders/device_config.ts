import { DeviceConfigInfo } from "../../karabo_data/DeviceConfigInfo";
import { Hash, HashValue } from "karabo-ts";
import { flattenHash } from "../hash_utils";
import { splitKaraboKeys } from "../../components/shared/helpers/splitKaraboKeys";

export const devicesConfigsFromHash = (hash: Hash): DeviceConfigInfo[] => {
  const devicesConfigsInfo: DeviceConfigInfo[] = [];
  const configurations = hash.getValue("configurations") as HashValue;
  const configsHash = new Hash(configurations);

  // Values of device properties are the leaves of the configuration Hash.
  // The path of each leaf has the form [deviceId].[propertyId]
  const configHashLeaves = flattenHash(configsHash);

  let currentDeviceId = "";
  let deviceConfigInfo: DeviceConfigInfo | undefined;
  // For the flattened "configurations" hash, the path of each leaf is the
  // "full" property name, e.g. "Karabo_GuiServer_0.performanceStatistics.numOfMessages"
  for (const { path, value, type, attrs } of configHashLeaves) {
    const { deviceId, propertyId } = splitKaraboKeys(path);
    if (deviceId !== currentDeviceId) {
      // A "section" with properties for a device different from the previous
      // (if any) leaf devices has been found - flush the entry for the previous
      // device (if any) and starts accumulating property information for the
      // new one.
      if (deviceConfigInfo !== undefined) {
        devicesConfigsInfo.push(deviceConfigInfo);
      }
      deviceConfigInfo = {
        deviceId: deviceId,
        properties: [],
      };
      currentDeviceId = deviceId;
    }
    deviceConfigInfo?.properties.push({
      key: propertyId,
      value: value,
      type: type,
      timeAttrs: attrs,
    });
  }
  // Push the property info for the last device of the batch (if any)
  if (deviceConfigInfo !== undefined) {
    devicesConfigsInfo.push(deviceConfigInfo);
  }
  return devicesConfigsInfo;
};
