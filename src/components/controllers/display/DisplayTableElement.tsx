import React from "react";
import type { DisplayTableElementProps } from "@/scene/scene_types/controllers/display";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { useKaraboTableProperty } from "@/components/shared/hooks/useKaraboTableProperty";
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

/**
 * DisplayTableElement - Displays table data from a property.
 * Styled to resemble the Qt table (full grid borders, compact rows).
 * Formats cells based on their data type.
 */
const DisplayTableElement: React.FC<DisplayTableElementProps> = (props) => {
  const keysStr = useKaraboKeysString(props.keys);

  // Get table data with pagination always enabled for testing
  const { tableData, paginatedTableData, pagination } = useKaraboTableProperty(
    keysStr,
    {
      enablePagination: true,
      initialPageSize: 10,
    }
  );

  // Use paginated data if available, otherwise use regular data
  const displayData = paginatedTableData ?? tableData;

  return (
    <ControllerContainer
      keys={props.keys}
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      showPropertyOverlay
      className="border border-gray-300 bg-white overflow-hidden flex flex-col"
    >
      {displayData ? (
        <div className="flex flex-col h-full">
          {/* Scrollable Table Container */}
          <div className="flex-1 overflow-auto">
            <Table className="w-full border border-gray-300 border-collapse text-xs">
              <TableHeader className="sticky top-0 z-10 bg-gray-100">
                <TableRow className="border-b border-gray-300">
                  {displayData.columns.map((col, idx) => (
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
                {displayData.cells.map((row, rowIdx) => (
                  <TableRow
                    key={`row-${rowIdx}`}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    {row.map((cell, cellIdx) => {
                      const column = displayData.columns[cellIdx];
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
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls - only shown when pagination is enabled */}
          {paginatedTableData && pagination && (
            <TablePagination data={paginatedTableData} controls={pagination} />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              No table data available yet.
            </p>
            <p className="text-xs text-gray-400 mt-1">Keys: {keysStr}</p>
          </div>
        </div>
      )}
    </ControllerContainer>
  );
};

export default DisplayTableElement;
