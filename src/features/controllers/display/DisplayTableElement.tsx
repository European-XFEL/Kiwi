/**
 * DisplayTableElement - controller component
 */
import React from 'react';
import type { DisplayTableElementProps } from '@/scene/scene_types/controllers/display';

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

import { formatTableCell, isNumericType } from './utils/formatTableCell';
import { Hash } from '@/karabo-hash/hash';
import type { SimpleValueTypes } from '@/karabo-hash/types';
import type { TableColumnInfo } from '@/karabo_data/DeviceSchemaInfo';

/**
 * Normalize table data coming from primary.value.
 */
function normalizeTableCells(raw: unknown): SimpleValueTypes[][] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  // TODO: evaluate if Shape A can really occur - didn't find it during the
  //       migration to the new Hash.

  // Shape A: already ValueTypes[][]
  if (Array.isArray(raw[0])) return raw as unknown as SimpleValueTypes[][];

  // Shape B: vector of Hashes
  if (raw[0] && raw[0] instanceof Hash) {
    try {
      const rows = raw as Hash[];

      return rows.map((rowObj: Hash) => {
        const rowCells: SimpleValueTypes[] = [];

        for (let [key, _] of rowObj) {
          const cellValue = rowObj.getValue(key);
          rowCells.push(cellValue);
        }

        return rowCells;
      });
    } catch {
      return [];
    }
  }

  return [];
}

function extractColumnBinding(
  primary: DisplayTableElementProps['primary']
): TableColumnInfo[] {
  const schema = (primary?.binding as any)?.rowSchema as
    | TableColumnInfo[]
    | undefined;

  return schema ?? [];
}

const DisplayTableElement: React.FC<DisplayTableElementProps> = ({
  tooltipText,
  disabledReason,
  primary,
}) => {
  const raw = primary?.value;

  const cells: SimpleValueTypes[][] = React.useMemo(() => {
    return normalizeTableCells(raw);
  }, [raw]);

  const columns: TableColumnInfo[] = React.useMemo(() => {
    return extractColumnBinding(primary);
  }, [primary]);

  const total_rows = cells.length;
  const has_binding = columns.length > 0;
  return (
    <div
      className="border border-gray-300 bg-white overflow-hidden flex flex-col w-full h-full"
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      {has_binding ? (
        <div className="flex flex-col h-full min-h-0">
          {/* Scrollable table container */}
          <div className="flex-1 min-h-0 overflow-y-scroll overflow-x-auto scrollbar-gutter-stable">
            <Table className="w-full border border-gray-300 border-collapse text-xs">
              <TableHeader className="sticky top-0 z-10 bg-gray-100">
                <TableRow className="border-b border-gray-300">
                  {columns.map((col, idx) => (
                    <TableHead
                      key={`col-${idx}-${col.columnName}`}
                      className="border border-gray-300 px-2 py-1 text-left align-middle font-semibold text-gray-800 text-[11px] whitespace-nowrap"
                    >
                      {col.columnAttributes.displayedName ?? col.columnName}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {cells.map((row, rowIdx) => (
                  <TableRow
                    key={`row-${rowIdx}`}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    {row.map((cell, cellIdx) => {
                      const column = columns[cellIdx];

                      if (!column) {
                        return (
                          <TableCell
                            key={`cell-${rowIdx}-${cellIdx}-missing-col`}
                            className="border border-gray-300 px-2 py-1 text-[11px] leading-tight text-gray-400"
                          >
                            —
                          </TableCell>
                        );
                      }

                      const formattedValue = formatTableCell(cell, column);
                      const numeric = isNumericType(
                        column.columnAttributes.valueType
                      );

                      return (
                        <TableCell
                          key={`cell-${rowIdx}-${cellIdx}-${column.columnName}`}
                          className={`border border-gray-300 px-2 py-1 text-[11px] leading-tight text-gray-900 align-middle whitespace-nowrap ${
                            numeric ? 'text-right' : 'text-left'
                          }`}
                        >
                          {formattedValue}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* unchanged empty state */
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              No table data available yet.
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              Rows: {total_rows} • Columns: {columns.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayTableElement;
