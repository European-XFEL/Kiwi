import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from '@/components/ui/pagination';
import type { PaginationControls, PaginatedTableData } from '@/controllers';

interface TablePaginationProps {
  data: PaginatedTableData;
  controls: PaginationControls;
  pageSizeOptions?: number[];
}

/**
 * Qt-style pagination bar for table components.
 * Compact layout, full-width top border, subtle buttons.
 */
export const TablePagination: React.FC<TablePaginationProps> = ({
  data,
  controls,
  pageSizeOptions = [10, 25, 50, 100, 200],
}) => {
  const hasRows = data.totalRows > 0;
  const startRow = hasRows ? (data.currentPage - 1) * data.pageSize + 1 : 0;
  const endRow = hasRows
    ? Math.min(data.currentPage * data.pageSize, data.totalRows)
    : 0;

  // Generate page numbers to display (max 7 items)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxPages = data.totalPages;
    const current = data.currentPage;

    if (maxPages <= 7) {
      for (let i = 1; i <= maxPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(maxPages - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < maxPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(maxPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between gap-4 border-t border-gray-300 bg-gray-100 px-3 py-1.5 text-[11px]">
      {/* Left: Rows info + page size */}
      <div className="flex items-center gap-4">
        <span className="text-gray-700 whitespace-nowrap">
          Rows {startRow}–{endRow} of {data.totalRows}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-gray-700 whitespace-nowrap">
            Rows per page:
          </span>
          <Select
            value={data.pageSize.toString()}
            onValueChange={(value) => controls.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-6 w-16 px-1 text-[11px] border-gray-300 rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-[11px]">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right: pagination controls */}
      <Pagination className="mx-0 w-auto">
        <PaginationContent className="flex items-center gap-1">
          <PaginationItem>
            <PaginationPrevious
              onClick={(e) => {
                e.preventDefault();
                if (controls.canGoPrev) controls.prevPage();
              }}
              className={`h-6 px-2 rounded-none border border-gray-300 text-[11px] leading-none ${
                !controls.canGoPrev
                  ? 'pointer-events-none opacity-40 bg-gray-100'
                  : 'cursor-pointer bg-white hover:bg-gray-50'
              }`}
            />
          </PaginationItem>

          {getPageNumbers().map((page, idx) =>
            page === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <span className="flex h-6 w-6 items-center justify-center text-[11px] text-gray-600">
                  …
                </span>
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={(e) => {
                    e.preventDefault();
                    controls.goToPage(page);
                  }}
                  isActive={page === data.currentPage}
                  className={`h-6 w-6 rounded-none border border-gray-300 text-[11px] leading-none flex items-center justify-center ${
                    page === data.currentPage
                      ? 'bg-blue-100 text-gray-900'
                      : 'bg-white hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              onClick={(e) => {
                e.preventDefault();
                if (controls.canGoNext) controls.nextPage();
              }}
              className={`h-6 px-2 rounded-none border border-gray-300 text-[11px] leading-none ${
                !controls.canGoNext
                  ? 'pointer-events-none opacity-40 bg-gray-100'
                  : 'cursor-pointer bg-white hover:bg-gray-50'
              }`}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
