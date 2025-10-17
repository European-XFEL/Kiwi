import { Hash, HashTypes, SchemaValue } from "karabo-ts";
import {
  DeviceSchemaInfo,
  PropertySchemaAttributes,
} from "@/karabo_data/DeviceSchemaInfo";

import { MetricPrefix, Unit } from "@/karabo_data/SchemaEnums";
import { flattenHash } from "@/karabo_hash/hash_utils";

export const deviceSchemaFromHash = (hash: Hash): DeviceSchemaInfo => {
  const deviceId = hash.getValue("deviceId");
  const schemaInfo = {
    deviceId: deviceId!.toString(),
    propertyDescriptors: new Map<string, PropertySchemaAttributes>(),
  };
  if (hash.getValue("schema") !== undefined) {
    const schemaHash = (hash.getValue("schema") as SchemaValue).hash;
    if (schemaHash !== undefined) {
      const schemaHashLeaves = flattenHash(schemaHash);
      for (const { path, attrs } of schemaHashLeaves) {
        const propAttrs: Partial<PropertySchemaAttributes> = {};
        for (const [key, karaboVal] of Object.entries(attrs)) {
          switch (key) {
            case "valueType":
              propAttrs.valueType = karaboVal.value_ as HashTypes;
              break;
            case "defaultValue":
              // TODO: The defaultValue should be typed accordingly to valueType
              propAttrs.defaultValue = karaboVal.value_;
              break;
            case "requiredAccessLevel":
              propAttrs.requiredAccessLevel = karaboVal.value_ as number;
              break;
            case "accessMode":
              propAttrs.accessMode = karaboVal.value_ as number;
              break;
            case "displayedName":
              propAttrs.displayedName = karaboVal.value_ as string;
              break;
            case "unitSymbol":
              if (Object.values(Unit).includes(karaboVal.value_ as Unit)) {
                propAttrs.unitSymbol = karaboVal.value_ as Unit;
              }
              break;
            case "metricPrefixSymbol":
              if (
                Object.values(MetricPrefix).includes(
                  karaboVal.value_ as MetricPrefix
                )
              ) {
                propAttrs.metricPrefixSymbol = karaboVal.value_ as MetricPrefix;
              }
              break;
            case "displayType":
              propAttrs.displayType = karaboVal.value_ as string;
              break;
            case "nodeType":
              propAttrs.nodeType = karaboVal.value_ as number;
              break;
            // TODO: handle remaining property attributes
          }
        }
        // Type assertion to PropertyAttributes before adding to the map
        schemaInfo.propertyDescriptors.set(
          path,
          propAttrs as PropertySchemaAttributes
        );
      }
    }
  }
  return schemaInfo;
};
