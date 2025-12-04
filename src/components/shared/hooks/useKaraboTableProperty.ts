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

export function useKaraboTableProperty(
  karaboKeys: string,
  options?: { enablePagination?: boolean; initialPageSize?: number }
) {
  const { enablePagination = false, initialPageSize = 50 } = options ?? {};

  const { deviceId, propertyPath } = React.useMemo(
    () => splitKaraboKeys(karaboKeys),
    [karaboKeys]
  );

  const { propertyDescriptor } = useKaraboSchema(karaboKeys);

  const [tableCells, setTableCells] = React.useState<
    VectorElementType[][] | null
  >(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  // 🔐 Robust handler – make sure we really have VectorElementType[][]
  const onUpdate = React.useCallback((raw: unknown) => {
    if (Array.isArray(raw) && (raw.length === 0 || Array.isArray(raw[0]))) {
      const cells = raw as VectorElementType[][];
      setTableCells(cells);
      setCurrentPage(1);
    } else {
      console.warn(
        "[useKaraboTableProperty] Expected VectorElementType[][] but got:",
        raw
      );
      // Optionally clear instead of crashing
      setTableCells(null);
    }
  }, []);

  React.useEffect(() => {
    if (!deviceId || !propertyPath) return;

    DevicePropertyConnector.inst.registerPropertyMonitor(
      deviceId,
      propertyPath,
      onUpdate as any
    );
    return () => {
      DevicePropertyConnector.inst.unregisterPropertyMonitor(
        deviceId,
        propertyPath,
        onUpdate as any
      );
    };
  }, [deviceId, propertyPath, onUpdate]);

  // Pagination calculations (defensive)
  const paginationInfo = React.useMemo(() => {
    if (!enablePagination || !Array.isArray(tableCells)) {
      return null;
    }

    const totalRows = tableCells.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRows);
    const paginatedCells = tableCells.slice(startIndex, endIndex);

    return {
      totalRows,
      totalPages,
      currentPage: safeCurrentPage,
      pageSize,
      startIndex,
      endIndex,
      paginatedCells,
    };
  }, [tableCells, currentPage, pageSize, enablePagination]);

  const paginationControls: PaginationControls | null = React.useMemo(() => {
    if (!enablePagination || !paginationInfo) return null;

    const totalPages = paginationInfo.totalPages;

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
        setCurrentPage(1);
      },
      canGoNext: paginationInfo.currentPage < totalPages,
      canGoPrev: paginationInfo.currentPage > 1,
    };
  }, [enablePagination, paginationInfo]);

  const tableData: TablePropertyData | null = React.useMemo(() => {
    if (!Array.isArray(tableCells) || !propertyDescriptor?.rowSchema) {
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

  const paginatedTableData: PaginatedTableData | null = React.useMemo(() => {
    if (!tableData || !paginationInfo) return null;

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
    propertyPath,
    tableData,
    paginatedTableData: enablePagination ? paginatedTableData : null,
    pagination: enablePagination ? paginationControls : null,
    cells: Array.isArray(tableCells) ? tableCells : null,
    columns: propertyDescriptor?.rowSchema ?? [],
    totalRows: Array.isArray(tableCells) ? tableCells.length : 0,
  };
}
