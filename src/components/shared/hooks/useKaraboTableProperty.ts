import * as React from "react";
import { DevicePropertyConnector } from "@/karabo_connectors/DevicePropertyConnector";
import { splitKaraboKeys } from "@/components/shared/helpers/splitKaraboKeys";
import { VectorElementType } from "@/karabo_hash/HashValueType";
import { useKaraboSchema } from "./useKaraboSchema";
import type { TableColumnInfo } from "@/karabo_data/DeviceSchemaInfo";

export interface TablePropertyData {
  cells: VectorElementType[][];
  columns: TableColumnInfo[];
}

export interface PaginatedTableData extends TablePropertyData {
  totalRows: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface PaginationControls {
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

/**
 * Custom hook for monitoring table properties (VectorHash type).
 *
 * Table properties are handled differently by DevicePropertyConnector:
 * - Regular properties receive PropertyInfo objects
 * - Table properties receive VectorElementType[][] (raw cell values)
 *
 * This hook properly handles the VectorElementType[][] type and combines it
 * with the rowSchema from the property descriptor to provide complete table data.
 *
 * @param karaboKeys - The Karabo keys for the table property
 * @param options - Optional pagination configuration
 */
export function useKaraboTableProperty(
  karaboKeys: string,
  options?: { enablePagination?: boolean; initialPageSize?: number }
) {
  const { enablePagination = false, initialPageSize = 50 } = options ?? {};

  const { deviceId, propertyId } = React.useMemo(
    () => splitKaraboKeys(karaboKeys),
    [karaboKeys]
  );

  // Get schema to access rowSchema for column definitions
  const { propertyDescriptor } = useKaraboSchema(karaboKeys);

  const [tableCells, setTableCells] = React.useState<
    VectorElementType[][] | null
  >(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  // The handler receives VectorElementType[][] for table properties
  const onUpdate = React.useCallback((cells: VectorElementType[][]) => {
    setTableCells(cells);
    // Reset to first page when data updates
    setCurrentPage(1);
  }, []);

  React.useEffect(() => {
    DevicePropertyConnector.inst.registerPropertyMonitor(
      deviceId,
      propertyId,
      onUpdate as any // Type cast needed because PropertyUpdateHandler can receive either PropertyInfo or VectorElementType[][]
    );
    return () => {
      DevicePropertyConnector.inst.unregisterPropertyMonitor(
        deviceId,
        propertyId,
        onUpdate as any
      );
    };
  }, [deviceId, propertyId, onUpdate]);

  // Pagination calculations
  const paginationInfo = React.useMemo(() => {
    if (!tableCells || !enablePagination) {
      return null;
    }

    const totalRows = tableCells.length;
    const totalPages = Math.ceil(totalRows / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRows);
    const paginatedCells = tableCells.slice(startIndex, endIndex);

    return {
      totalRows,
      totalPages,
      currentPage,
      pageSize,
      startIndex,
      endIndex,
      paginatedCells,
    };
  }, [tableCells, currentPage, pageSize, enablePagination]);

  // Pagination controls
  const paginationControls: PaginationControls = React.useMemo(() => {
    const totalPages = paginationInfo?.totalPages ?? 1;

    return {
      goToPage: (page: number) => {
        const clampedPage = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(clampedPage);
      },
      nextPage: () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
      },
      prevPage: () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
      },
      setPageSize: (size: number) => {
        setPageSize(size);
        setCurrentPage(1); // Reset to first page when page size changes
      },
      canGoNext: currentPage < totalPages,
      canGoPrev: currentPage > 1,
    };
  }, [currentPage, paginationInfo?.totalPages]);

  // Combine cells with column schema
  const tableData: TablePropertyData | null = React.useMemo(() => {
    if (!tableCells || !propertyDescriptor?.rowSchema) {
      return null;
    }

    const cells =
      enablePagination && paginationInfo
        ? paginationInfo.paginatedCells
        : tableCells;

    return {
      cells,
      columns: propertyDescriptor.rowSchema,
    };
  }, [
    tableCells,
    propertyDescriptor?.rowSchema,
    enablePagination,
    paginationInfo,
  ]);

  // Paginated table data with metadata
  const paginatedTableData: PaginatedTableData | null = React.useMemo(() => {
    if (!tableData || !paginationInfo) {
      return null;
    }

    return {
      ...tableData,
      totalRows: paginationInfo.totalRows,
      currentPage: paginationInfo.currentPage,
      totalPages: paginationInfo.totalPages,
      pageSize: paginationInfo.pageSize,
    };
  }, [tableData, paginationInfo]);

  return {
    deviceId,
    propertyId,
    tableData,
    paginatedTableData: enablePagination ? paginatedTableData : null,
    pagination: enablePagination ? paginationControls : null,
    cells: tableCells,
    columns: propertyDescriptor?.rowSchema ?? [],
    totalRows: tableCells?.length ?? 0,
  };
}
