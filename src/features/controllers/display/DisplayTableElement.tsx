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
import type { BaseBinding } from '@/lib/binding/BaseBinding';
import type { SimpleValueTypes } from '@/karabo-hash/types';

type RowSchema = Record<string, BaseBinding>;
type Column = { key: string; binding: BaseBinding };

const toColumns = (rowSchema?: RowSchema): Column[] =>
  rowSchema
    ? Object.entries(rowSchema).map(([key, binding]) => ({ key, binding }))
    : [];

const normalizeTableCells = (
  raw: unknown,
  columnKeys: readonly string[]
): SimpleValueTypes[][] => {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (!(raw[0] instanceof Hash)) return [];

  try {
    const rows = raw as Hash[];
    return rows.map((rowObj) =>
      columnKeys.map((k) => rowObj.getValue(k) as SimpleValueTypes)
    );
  } catch {
    return [];
  }
};

const DisplayTableElement: React.FC<DisplayTableElementProps> = ({
  tooltipText,
  disabledReason,
  primary,
}) => {
  const title = tooltipText || disabledReason || '';

  const raw = primary?.value;
  const rowSchema = (primary as any)?.binding?.rowSchema as
    | RowSchema
    | undefined;

  const columns = React.useMemo(() => toColumns(rowSchema), [rowSchema]);
  const columnKeys = React.useMemo(
    () => columns.map(({ key }) => key),
    [columns]
  );

  const cells = React.useMemo(
    () => normalizeTableCells(raw, columnKeys),
    [raw, columnKeys]
  );

  const totalRows = cells.length;
  const hasBinding = columns.length > 0;

  return (
    <div
      className="border border-gray-300 bg-white overflow-hidden flex flex-col w-full h-full"
      title={title}
    >
      {hasBinding ? (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 min-h-0 overflow-y-scroll overflow-x-auto scrollbar-gutter-stable">
            <Table className="w-full border border-gray-300 border-collapse text-xs">
              <TableHeader className="sticky top-0 z-10 bg-gray-100">
                <TableRow className="border-b border-gray-300">
                  {columns.map(({ key, binding }) => {
                    const header = binding.displayedName ?? key;

                    return (
                      <TableHead
                        key={`col-${key}`}
                        className="border border-gray-300 px-2 py-1 text-left align-middle font-semibold text-gray-800 text-[11px] whitespace-nowrap"
                      >
                        {header}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>

              <TableBody>
                {cells.map((row, rowIndex) => (
                  <TableRow
                    key={`row-${rowIndex}`}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    {columns.map(({ key, binding }, columnIndex) => {
                      const cell = row[columnIndex];
                      const numeric = isNumericType(binding.valueType);

                      const value = formatTableCell(cell, binding);

                      return (
                        <TableCell
                          key={`cell-${rowIndex}-${key}`}
                          className={`border border-gray-300 px-2 py-1 text-[11px] leading-tight text-gray-900 align-middle whitespace-nowrap ${
                            numeric ? 'text-right' : 'text-left'
                          }`}
                        >
                          {value}
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
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              No table data available yet.
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              Rows: {totalRows} • Columns: {columns.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayTableElement;
