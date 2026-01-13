import * as React from 'react';
import type { VectorElementType } from '@/karabo_hash/HashValueType';
import { useDeviceProperty } from '@/lib/binding';
import type { TableColumnInfo } from '@/karabo_data/DeviceSchemaInfo';

export interface PaginationControls {
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export interface PaginatedTableData {
  cells: VectorElementType[][];
  columns: TableColumnInfo[];
  totalRows: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

/**
 * Hook for working with table properties with optional pagination.
 *
 * Note: Scene controller widgets (DisplayTableElement) use ControllerContainer
 * which calls useDeviceProperty internally and passes data via props.
 * This hook is for custom components outside the scene system that need
 * direct table property access with built-in pagination support.
 */
export function useDeviceTableProperty(
  karaboKeys: string,
  options?: { enablePagination?: boolean; initialPageSize?: number }
) {
  const { enablePagination = false, initialPageSize = 50 } = options ?? {};
  const primary = useDeviceProperty(karaboKeys);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const cells = React.useMemo(() => {
    const v = primary.value as any;
    if (Array.isArray(v) && (v.length === 0 || Array.isArray(v[0]))) {
      return v as VectorElementType[][];
    }
    return null;
  }, [primary.value]);

  const columns = React.useMemo(() => {
    const rowSchema = (primary.schemaAttrs as any)?.rowSchema;
    return Array.isArray(rowSchema) ? (rowSchema as TableColumnInfo[]) : [];
  }, [primary.schemaAttrs]);

  const paginationInfo = React.useMemo(() => {
    if (!enablePagination || !cells) return null;

    const totalRows = cells.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRows);

    return {
      totalRows,
      totalPages,
      currentPage: safeCurrentPage,
      pageSize,
      paginatedCells: cells.slice(startIndex, endIndex),
    };
  }, [cells, currentPage, pageSize, enablePagination]);

  const tableData = React.useMemo(() => {
    if (!cells || columns.length === 0) return null;

    const finalCells =
      enablePagination && paginationInfo
        ? paginationInfo.paginatedCells
        : cells;

    return { cells: finalCells, columns };
  }, [cells, columns, enablePagination, paginationInfo]);

  const pagination = React.useMemo(() => {
    if (!enablePagination || !paginationInfo) return null;

    return {
      goToPage: (page: number) =>
        setCurrentPage(Math.max(1, Math.min(page, paginationInfo.totalPages))),
      nextPage: () =>
        setCurrentPage((p) => Math.min(p + 1, paginationInfo.totalPages)),
      prevPage: () => setCurrentPage((p) => Math.max(p - 1, 1)),
      setPageSize: (size: number) => {
        setPageSize(size);
        setCurrentPage(1);
      },
      canGoNext: paginationInfo.currentPage < paginationInfo.totalPages,
      canGoPrev: paginationInfo.currentPage > 1,
    };
  }, [enablePagination, paginationInfo]);

  return {
    primary,
    tableData,
    pagination,
    paginatedTableData:
      enablePagination && tableData && paginationInfo
        ? {
            ...tableData,
            totalRows: paginationInfo.totalRows,
            totalPages: paginationInfo.totalPages,
            currentPage: paginationInfo.currentPage,
            pageSize: paginationInfo.pageSize,
          }
        : null,
  };
}
