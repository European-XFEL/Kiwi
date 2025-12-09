/**
 * DisplayTableElement - controller component
 *
 */

import React from "react";
import type { DisplayTableElementProps } from "@/scene/scene_types/controllers/display";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { TablePagination } from "@/components/shared/TablePagination";

import {
  formatTableCell,
  isNumericType,
} from "@/components/shared/helpers/formatTableCell";

import type { VectorElementType } from "@/karabo_hash/HashValueType";

import type { TableColumnInfo } from "@/karabo_data/DeviceSchemaInfo";

const DEFAULT_PAGE_SIZE = 10;

/**
 * Normalize table data coming from primary.value.

 */
function normalizeTableCells(raw: unknown): VectorElementType[][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  // Shape A: already VectorElementType[][]
  if (Array.isArray(raw[0])) {
    return raw as unknown as VectorElementType[][];
  }

  // Shape B: legacy row-object shape
  if (raw[0] && typeof raw[0] === "object") {
    try {
      const rows = raw as Record<string, unknown>[];

      const cells = rows.map((rowObj) => {
        const rowCells: VectorElementType[] = [];

        for (const [, node] of Object.entries(rowObj)) {
          const cellValue = (node as any)?.value?.value_ as VectorElementType;

          rowCells.push(cellValue);
        }

        return rowCells;
      });

      return cells;
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Pull row schema from whichever location your new descriptor/schemaAttrs exposes.
 * Typed return prevents implicit-any in render loops.
 */
function extractColumnsFromPrimary(
  primary: DisplayTableElementProps["primary"]
): TableColumnInfo[] {
  const fromSchemaAttrs = (primary?.schemaAttrs as any)?.rowSchema as
    | TableColumnInfo[]
    | undefined;

  const fromDescriptorDirect = (primary?.descriptor as any)?.rowSchema as
    | TableColumnInfo[]
    | undefined;

  const fromDescriptorSchemaAttrs = (primary?.descriptor?.schemaAttrs as any)
    ?.rowSchema as TableColumnInfo[] | undefined;

  return (
    fromSchemaAttrs ?? fromDescriptorDirect ?? fromDescriptorSchemaAttrs ?? []
  );
}

const DisplayTableElement: React.FC<DisplayTableElementProps> = ({
  tooltipText,
  disabledReason,
  primary,
}) => {
  const raw = primary?.value;

  // ---- normalize cells robustly ----
  const cells: VectorElementType[][] = React.useMemo(() => {
    return normalizeTableCells(raw);
  }, [raw]);

  // ---- typed columns ----
  const columns: TableColumnInfo[] = React.useMemo(() => {
    return extractColumnsFromPrimary(primary);
  }, [primary]);

  // ---- local pagination state ----
  const [pageSize, setPageSize] = React.useState<number>(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // reset page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [cells.length, columns.length]);

  const totalRows = cells.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);
  const displayCells = cells.slice(startIndex, endIndex);

  const paginationControls = React.useMemo(() => {
    return {
      goToPage: (p: number) =>
        setCurrentPage(Math.max(1, Math.min(p, totalPages))),
      nextPage: () => setCurrentPage((p) => Math.min(p + 1, totalPages)),
      prevPage: () => setCurrentPage((p) => Math.max(p - 1, 1)),
      setPageSize: (s: number) => {
        const safeSize = Math.max(1, s);
        setPageSize(safeSize);
        setCurrentPage(1);
      },
      canGoNext: safePage < totalPages,
      canGoPrev: safePage > 1,
    };
  }, [safePage, totalPages]);

  const hasRenderableData = columns.length > 0 && displayCells.length > 0;

  return (
    <div
      className="border border-gray-300 bg-white overflow-hidden flex flex-col w-full h-full"
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      {hasRenderableData ? (
        <div className="flex flex-col h-full">
          {/* Scrollable table container */}
          <div className="flex-1 overflow-auto">
            <Table className="w-full border border-gray-300 border-collapse text-xs">
              <TableHeader className="sticky top-0 z-10 bg-gray-100">
                <TableRow className="border-b border-gray-300">
                  {columns.map((col: TableColumnInfo, idx: number) => (
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
                {displayCells.map(
                  (row: VectorElementType[], rowIdx: number) => (
                    <TableRow
                      key={`row-${rowIdx}`}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      {row.map((cell: VectorElementType, cellIdx: number) => {
                        const column = columns[cellIdx];

                        // Guard against mismatched column/cell lengths
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
                        const isNumeric = isNumericType(
                          column.columnAttributes.valueType
                        );

                        return (
                          <TableCell
                            key={`cell-${cellIdx}-${column.columnName}`}
                            className={`border border-gray-300 px-2 py-1 text-[11px] leading-tight text-gray-900 align-middle whitespace-nowrap ${
                              isNumeric ? "text-right" : "text-left"
                            }`}
                          >
                            {formattedValue}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controlled locally */}
          <TablePagination
            data={{
              cells: displayCells,
              columns,
              totalRows,
              currentPage: safePage,
              totalPages,
              pageSize,
            }}
            controls={paginationControls}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              No table data available yet.
            </p>

            {/* Helpful debug info without console noise */}
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
