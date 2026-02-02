import {
  DeviceSchemaInfo,
  PropertySchemaAttributes,
  TableColumnInfo,
} from '@/karabo_data/DeviceSchemaInfo';

import { MetricPrefix, Unit } from '@/karabo_data/SchemaEnums';
import { flattenHash } from '@/karabo_hash/hash_utils';
import { KaraboValue, SimpleValueTypes } from '@/karabo-hash/types';
import { Hash as NewHash, Schema } from '@/karabo-hash/hash';
import { HashTypes } from '@/karabo-hash/typenums';

/// Decodes the rowSchema attribute of a Table property into a list of
/// TableColumnInfo records. The value of the rowSchema attribute is an
/// schema itself.
const decodeRowSchema = (karaboVal: KaraboValue): TableColumnInfo[] => {
  const tableColumns: TableColumnInfo[] = [];
  const rowSchemaHash = karaboVal.value_ as object;
  if ('hash' in rowSchemaHash) {
    // The value of a rowSchema is not mapped in the types.d.ts of
    // karabo-ts at the moment. It is an object with an empty "name"
    // and a Hash in its "hash" property. That's the reason for
    // the 'as object' cast and the '"hash" in' condition above.
    const columnsInfoHash = rowSchemaHash['hash'] as NewHash;
    const columns = flattenHash(columnsInfoHash);

    for (const column of columns) {
      const columnName = column.path;
      const columnAttrs: PropertySchemaAttributes = {
        valueType: column.type,
        defaultValue: column.attrs.has('defaultValue')
          ? column.attrs.getValue('defaultValue')
          : undefined,
        displayedName: column.attrs.has('displayedName')
          ? column.attrs.getValue('displayedName')
          : undefined,
        requiredAccessLevel: column.attrs.has('requiredAccessLevel')
          ? column.attrs.getValue('requiredAccessLevel')
          : undefined,
        accessMode: column.attrs.has('accessMode')
          ? column.attrs.getValue('accessMode')
          : undefined,
        nodeType: column.attrs.has('nodeType')
          ? column.attrs.getValue('nodeType')
          : undefined,
      };
      const tableColumn = {
        columnName: columnName,
        columnAttributes: columnAttrs,
      };
      tableColumns.push(tableColumn);
    }
  }
  return tableColumns;
};

export const deviceSchemaFromHash = (hash: NewHash): DeviceSchemaInfo => {
  const deviceId = hash.getValue('deviceId');
  const schemaInfo = {
    deviceId: deviceId!.toString(),
    propertyDescriptors: new Map<string, PropertySchemaAttributes>(),
  };
  if (hash.getValue('schema') !== undefined) {
    const schemaHash = (hash.getValue('schema') as Schema).hash;
    if (schemaHash !== undefined) {
      const schemaHashLeaves = flattenHash(schemaHash);
      for (const { path, attrs } of schemaHashLeaves) {
        const propAttrs: Partial<PropertySchemaAttributes> = {};
        for (let [key, karaboVal] of attrs) {
          //for (const [key, karaboVal] of Object.entries(attrs)) {
          switch (key) {
            case 'valueType':
              propAttrs.valueType = karaboVal.value_ as HashTypes;
              break;
            case 'defaultValue':
              propAttrs.defaultValue = karaboVal.value_;
              break;
            case 'requiredAccessLevel':
              propAttrs.requiredAccessLevel = karaboVal.value_ as number;
              break;
            case 'accessMode':
              propAttrs.accessMode = karaboVal.value_ as number;
              break;
            case 'displayedName':
              propAttrs.displayedName = karaboVal.value_ as string;
              break;
            case 'options':
              propAttrs.options = karaboVal.value_ as SimpleValueTypes[];
              break;
            case 'unitSymbol':
              if (Object.values(Unit).includes(karaboVal.value_ as Unit)) {
                propAttrs.unitSymbol = karaboVal.value_ as Unit;
              }
              break;
            case 'metricPrefixSymbol':
              if (
                Object.values(MetricPrefix).includes(
                  karaboVal.value_ as MetricPrefix
                )
              ) {
                propAttrs.metricPrefixSymbol = karaboVal.value_ as MetricPrefix;
              }
              break;
            case 'displayType':
              propAttrs.displayType = karaboVal.value_ as string;
              break;
            case 'nodeType':
              propAttrs.nodeType = karaboVal.value_ as number;
              break;
            case 'allowedStates':
              propAttrs.allowedStates = karaboVal.value_ as string[];
              break;
            case 'rowSchema':
              propAttrs.rowSchema = decodeRowSchema(karaboVal);
              break;
            // TODO: handle remaining property attributes
          }
        }
        schemaInfo.propertyDescriptors.set(
          path,
          propAttrs as PropertySchemaAttributes
        );
      }
    }
  }
  return schemaInfo;
};
