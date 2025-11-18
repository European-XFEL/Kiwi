import React from "react";
import type { DisplayTableElementProps } from "@/scene/scene_types/controllers/display";
import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { useDeviceOnlineStatus } from "@/components/shared/hooks/useDeviceOnlineStatus";
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

/**
 * DisplayTableElement - Displays table data from a property.
 * Styled to resemble the Qt table (full grid borders, compact rows).
 * Pagination is always enabled for testing.
 */
const DisplayTableElement: React.FC<DisplayTableElementProps> = (props) => {
  const keysStr = useKaraboKeysString(props.keys);

  // Get table data with pagination always enabled for testing
  const {
    deviceId,
    tableData,
    paginatedTableData,
    pagination,
    // cells,
    columns,
    // totalRows,
  } = useKaraboTableProperty(keysStr, {
    enablePagination: true, // Always enable for now
    initialPageSize: 10,
  });

  const isOffline = useDeviceOnlineStatus(deviceId);

  // Use paginated data if available, otherwise use regular data
  const displayData = paginatedTableData ?? tableData;

  // Debug logging
  // React.useEffect(() => {
  //   console.log("[DisplayTableElement] totalRows:", totalRows);
  //   console.log("[DisplayTableElement] paginatedTableData:", paginatedTableData);
  //   console.log("[DisplayTableElement] pagination:", pagination);
  // }, [totalRows, paginatedTableData, pagination]);

  return (
    <div
      className="absolute border border-gray-300 bg-white overflow-hidden flex flex-col"
      style={{
        width: props.width,
        height: props.height,
        left: props.x,
        top: props.y,
      }}
    >
      {isOffline ? (
        <DeviceOfflineOverlay
          keys={props.keys}
          x={props.x}
          y={props.y}
          width={props.width}
          height={props.height}
        />
      ) : (
        <>
          {displayData ? (
            <div className="flex flex-col h-full">
              {/* Scrollable Table Container */}
              <div className="flex-1 overflow-auto">
                <Table className="w-full border border-gray-300 border-collapse text-xs">
                  <TableHeader className="sticky top-0 z-10 bg-gray-100">
                    <TableRow className="border-b border-gray-300">
                      {displayData.columns.map((col, idx) => (
                        <TableHead
                          key={idx}
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
                        key={rowIdx}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        {row.map((cell, cellIdx) => (
                          <TableCell
                            key={cellIdx}
                            className="border border-gray-300 px-2 py-1 text-[11px] leading-tight text-gray-900 align-middle whitespace-nowrap"
                          >
                            {String(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls - only shown when pagination is enabled */}
              {paginatedTableData && pagination && (
                <TablePagination
                  data={paginatedTableData}
                  controls={pagination}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  No table data available yet.
                </p>
                <p className="text-xs text-gray-400 mt-1">Keys: {keysStr}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Columns: {columns.length > 0 ? columns.length : "loading..."}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DisplayTableElement;
