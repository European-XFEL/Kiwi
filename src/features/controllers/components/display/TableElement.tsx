/** TableElement — schema-aware table for DisplayTableElement / EditableTableElement. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/controllers/components/ControllerContainer';
import { TableElementModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/registry';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/table';
import {
  formatTableCell,
  isNumericType,
} from '@/features/controllers/utils/formatTableCell';
import { Hash } from '@/karabo/data/hash';
import type { BaseBinding } from '@/lib/binding/BaseBinding';
import type { SimpleValueTypes } from '@/karabo/data/types';

// TableElement
// ----------------------------------------------------------------------------

type RowSchema = Record<string, BaseBinding>;
type Column = { key: string; binding: BaseBinding };

function toColumns(rowSchema?: RowSchema): Column[] {
  return rowSchema
    ? Object.entries(rowSchema).map(([key, binding]) => ({ key, binding }))
    : [];
}

function toRows(
  raw: unknown,
  columnKeys: readonly string[]
): SimpleValueTypes[][] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (!(raw[0] instanceof Hash)) return [];
  try {
    return (raw as Hash[]).map((row) =>
      columnKeys.map((k) => row.getValue(k) as SimpleValueTypes)
    );
  } catch {
    return [];
  }
}

const TableElement: React.FC<{
  model: TableElementModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const rawValue = ctx?.primary?.value;
  const rowSchema = (ctx?.primary as any)?.binding?.rowSchema as
    | RowSchema
    | undefined;

  const columns = React.useMemo(() => toColumns(rowSchema), [rowSchema]);
  const columnKeys = React.useMemo(
    () => columns.map(({ key }) => key),
    [columns]
  );
  const cells = React.useMemo(
    () => toRows(rawValue, columnKeys),
    [rawValue, columnKeys]
  );

  const title = ctx?.tooltipText ?? ctx?.disabledReason;

  if (!columns.length) {
    return (
      <div
        className="flex items-center justify-center w-full h-full border border-solid bg-white text-xs text-gray-400 select-none"
        title={title}
      >
        No data
      </div>
    );
  }

  return (
    <div
      className="border border-gray-300 bg-white overflow-hidden flex flex-col w-full h-full"
      title={title}
    >
      <div className="flex-1 min-h-0 overflow-y-scroll overflow-x-auto">
        <Table className="w-full border-collapse text-xs">
          <TableHeader className="sticky top-0 z-10 bg-gray-100">
            <TableRow className="border-b border-gray-300">
              {columns.map(({ key, binding }) => (
                <TableHead
                  key={key}
                  className="border border-gray-300 px-2 py-1 text-left align-middle font-semibold text-gray-800 whitespace-nowrap"
                >
                  {binding.displayedName || key}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cells.map((row, rowIdx) => (
              <TableRow key={rowIdx} className="hover:bg-gray-50">
                {columns.map(({ key, binding }, colIdx) => (
                  <TableCell
                    key={key}
                    className={`border border-gray-200 px-2 py-0.5 whitespace-nowrap align-middle ${
                      isNumericType(binding.hashType)
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    {formatTableCell(row[colIdx], binding)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

registerRenderer('DisplayTableElement', TableElement);
registerRenderer('EditableTableElement', TableElement);

export default TableElement;
