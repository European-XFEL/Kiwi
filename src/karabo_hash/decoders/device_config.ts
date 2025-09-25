import { DeviceConfigInfo } from "../../karabo_data/DeviceConfigInfo";
import { Hash, HashValue } from "karabo-ts";

// TODO: Check if this type guard should come from karabo-ts (improve it in the process)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _isHashValue(obj: any): obj is HashValue {
  if (typeof obj !== "object" || obj === undefined || obj === null) {
    return false;
  }
  // Checks that all the keys of the HashValue are strings
  for (const objPropKey of Object.keys(obj)) {
    if (typeof objPropKey !== "string") {
      return false;
    }
  }
  // Checks that all the values of the HashValue are potential HashNodes - have
  // a "value" property
  for (const objPropValue of Object.values(obj)) {
    if (
      typeof objPropValue !== "object" ||
      objPropValue === null ||
      !Object.prototype.hasOwnProperty.call(objPropValue, "value")
    ) {
      return false;
    }
  }
  return true;
}

export const devicesConfigsFromHash = (hash: Hash): DeviceConfigInfo[] => {
  const devicesConfigInfo: DeviceConfigInfo[] = [];
  const configurations = hash.getValue("configurations") as HashValue;
  // Iterate through the deviceId keys of the "configurations" hash
  for (const [instanceId, propsHash, _] of new Hash(configurations).iterall()) {
    const deviceConfig: DeviceConfigInfo = {
      deviceId: instanceId,
      properties: [],
    };
    if (_isHashValue(propsHash)) {
      // Iterate through the propertyId keys of the device
      // TODO: "flatten" property paths
      // TODO: add propType (information available on the hash value as type_) to the propInfo type
      for (const [propId, propValue, _] of new Hash(propsHash).iterall()) {
        const propInfo = { propertyId: propId, propertyValue: propValue };
        deviceConfig.properties.push(propInfo);
      }
    }
    devicesConfigInfo.push(deviceConfig);
  }
  return devicesConfigInfo;
};
