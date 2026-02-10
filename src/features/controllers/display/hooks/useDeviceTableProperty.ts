import * as React from 'react';
import type { SimpleValueTypes } from '@/karabo-hash/types';
import { useDeviceProperty } from '@/lib/binding';
import type { TableColumnInfo } from '@/karabo_data/DeviceSchemaInfo';

export function useDeviceTableProperty(karaboKeys: string) {
  const primary = useDeviceProperty(karaboKeys);

  const cells = React.useMemo(() => {
    const v = primary.value as any;
    if (Array.isArray(v) && (v.length === 0 || Array.isArray(v[0]))) {
      return v as SimpleValueTypes[][];
    }
    return null;
  }, [primary.value]);

  const columns = React.useMemo(() => {
    const rowSchema = (primary.binding as any)?.rowSchema;
    return Array.isArray(rowSchema) ? (rowSchema as TableColumnInfo[]) : [];
  }, [primary.binding]);

  const tableData = React.useMemo(() => {
    if (!cells || columns.length === 0) return null;
    return { cells, columns };
  }, [cells, columns]);

  return {
    primary,
    tableData,
  };
}
