import {
  PropertySchemaAttributes,
  TableColumnInfo,
} from '@/karabo_data/DeviceSchemaInfo';

import { flattenHash } from '@/karabo_hash/hash_utils';
import { KaraboValue } from '@/karabo-hash/types';
import { Hash as NewHash } from '@/karabo-hash/hash';

/// Decodes the rowSchema attribute of a Table property into a list of
/// TableColumnInfo records. The value of the rowSchema attribute is an
/// schema itself.
export const decodeRowSchema = (karaboVal: KaraboValue): TableColumnInfo[] => {
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
