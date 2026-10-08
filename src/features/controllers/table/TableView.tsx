import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import {
  FilterTableElementModel,
  TableElementModel,
} from '@/karabo/common/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/api';
import { Hash } from '@/karabo/data/api';
import { BaseBinding, VectorHashBinding } from '@/lib/binding/api';
import { formatTableCell, isNumericType } from './formatTableCell';
import { getDisplayDelegate, type TableDelegate } from './getDisplayDelegate';
import { canAct } from './canAct';

type Column = {
  key: string;
  binding: BaseBinding;
  delegate: TableDelegate;
  className: string;
};
type Row = { data: Hash; index: number };
type TableViewProps = {
  ctx?: ControllerContainerContext;
  delegatesByColumn?: Readonly<Record<number, TableDelegate | undefined>>;
};

function useTableData({ ctx, delegatesByColumn }: TableViewProps) {
  const binding = ctx?.proxy?.binding;
  const rowSchema =
    binding instanceof VectorHashBinding && binding.attributes.has('rowSchema')
      ? binding.rowSchema
      : undefined;
  const columns = React.useMemo(
    () =>
      Object.entries(rowSchema ?? {}).map(([key, binding], index) => {
        const custom =
          delegatesByColumn && Object.hasOwn(delegatesByColumn, index)
            ? delegatesByColumn[index]
            : undefined;
        return {
          key,
          binding,
          delegate: custom ?? getDisplayDelegate(binding),
          className: `border border-gray-300 px-2 py-0.5 whitespace-nowrap align-middle ${isNumericType(binding.hashType) ? 'text-right' : 'text-left'}`,
        };
      }),
    [rowSchema, delegatesByColumn]
  );
  const rawValue: unknown = ctx?.proxy?.value;
  // Overrides affect presentation only. Validation depends on data and schema.
  const rows = React.useMemo(() => {
    const keys = Object.keys(rowSchema ?? {});
    if (
      !Array.isArray(rawValue) ||
      !rawValue.every(
        (row) => row instanceof Hash && keys.every((key) => row.has(key))
      )
    ) {
      return [];
    }
    return rawValue.map((data: Hash, index) => ({ data, index }));
  }, [rawValue, rowSchema]);
  return { columns, rows };
}

export function TableView(
  props: TableViewProps & { model: TableElementModel }
) {
  const { columns, rows } = useTableData(props);
  return <TableRenderer {...props} columns={columns} rows={rows} />;
}

export function FilterTableView(
  props: TableViewProps & { model: FilterTableElementModel }
) {
  const { model, ctx } = props;
  const { columns, rows: sourceRows } = useTableData(props);
  const [query, setQuery] = React.useState('');
  const [selectedKey, setSelectedKey] = React.useState<string>();
  const [sort, setSort] = React.useState<{ key: string; ascending: boolean }>();
  const initialKey = columns[model.filterKeyColumn]?.key ?? columns[0]?.key;
  let filterKey = selectedKey;
  if (selectedKey === undefined) {
    filterKey = initialKey;
  } else if (!columns.some(({ key }) => key === selectedKey)) {
    filterKey = columns[0]?.key;
  }
  React.useEffect(() => {
    setSelectedKey(filterKey);
  }, [filterKey]);
  const sortKey = columns.some(({ key }) => key === sort?.key)
    ? sort!.key
    : columns[0]?.key;
  const ascending = sort?.ascending ?? true;
  const searchColumn = columns.find(({ key }) => key === filterKey);
  const searchKey = searchColumn?.key;
  const searchBinding = searchColumn?.binding;
  const search = query.toLowerCase();
  const filteredRows = React.useMemo(() => {
    if (!search || searchKey === undefined || !searchBinding) {
      return sourceRows;
    }
    return sourceRows.filter(({ data }) =>
      formatTableCell(data.getValue(searchKey), searchBinding)
        .toLowerCase()
        .includes(search)
    );
  }, [sourceRows, searchKey, searchBinding, search]);
  const sortColumn = columns.find(({ key }) => key === sortKey);
  const sortBinding = sortColumn?.binding;
  const sortKeys = React.useMemo(() => {
    if (!model.sortingEnabled || sortKey === undefined || !sortBinding) {
      return undefined;
    }
    return filteredRows.map((row) => ({
      row,
      text: formatTableCell(row.data.getValue(sortKey), sortBinding),
    }));
  }, [filteredRows, sortKey, sortBinding, model.sortingEnabled]);
  const rows = React.useMemo(() => {
    if (!sortKeys) {
      return filteredRows;
    }
    return [...sortKeys]
      .sort((a, b) => {
        let order = 0;
        if (a.text < b.text) {
          order = -1;
        } else if (a.text > b.text) {
          order = 1;
        }
        return (ascending ? order : -order) || a.row.index - b.row.index;
      })
      .map(({ row }) => row);
  }, [filteredRows, sortKeys, ascending]);
  return (
    <TableRenderer
      model={model}
      ctx={ctx}
      columns={columns}
      rows={rows}
      sortKey={sortKey}
      ascending={ascending}
      onSort={
        model.sortingEnabled
          ? (key) =>
              setSort({
                key,
                ascending: key === sortKey ? !ascending : true,
              })
          : undefined
      }
    >
      <div className="flex gap-1 p-1 border-b border-gray-300 text-xs">
        {model.showFilterKeyColumn && (
          <select
            aria-label="Filter column"
            value={filterKey ?? ''}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="min-w-0 border border-gray-400"
          >
            {columns.map(({ key, binding }) => (
              <option key={key} value={key}>
                {binding.displayedName || key}
              </option>
            ))}
          </select>
        )}
        <input
          aria-label="Filter"
          placeholder="Filter"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 border border-gray-400 px-1"
        />
        <button
          type="button"
          onClick={() => setQuery('')}
          className="border border-gray-400 bg-gray-100 px-1"
        >
          Clear Filter
        </button>
      </div>
    </TableRenderer>
  );
}

function TableRenderer({
  model,
  ctx,
  columns,
  rows,
  sortKey,
  ascending,
  onSort,
  children,
}: {
  model: TableElementModel | FilterTableElementModel;
  ctx?: ControllerContainerContext;
  columns: Column[];
  rows: Row[];
  sortKey?: string;
  ascending?: boolean;
  onSort?: (key: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-gray-400 bg-white overflow-hidden flex flex-col w-full h-full">
      {children}
      {!columns.length ? (
        <div className="flex flex-1 items-center justify-center text-xs text-gray-400 select-none">
          No data
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <Table
            className="border-collapse text-xs"
            style={{
              width: model.resizeToContents ? 'max-content' : '100%',
              minWidth: '100%',
            }}
          >
            <TableHeader>
              <TableRow className="border-b border-gray-300">
                <TableHead className="sticky left-0 top-0 z-20 w-7 min-w-7 border border-gray-300 bg-gray-100 px-1 py-1 text-right align-middle font-normal text-gray-600" />
                {columns.map(({ key, binding }, column) => (
                  <TableHead
                    key={key}
                    style={{
                      width: column === columns.length - 1 ? 'auto' : '1%',
                    }}
                    aria-sort={
                      onSort && key === sortKey
                        ? ascending
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className="sticky top-0 z-10 border border-gray-300 bg-gray-100 px-2 py-1 text-left align-middle font-semibold text-gray-800 whitespace-nowrap"
                  >
                    {onSort ? (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => onSort(key)}
                      >
                        {binding.displayedName || key}
                      </button>
                    ) : (
                      binding.displayedName || key
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <MemoizedTableDataBody
              columns={columns}
              rows={rows}
              ctx={ctx}
              proxy={ctx?.proxy}
              actionAllowed={canAct(ctx)}
            />
          </Table>
        </div>
      )}
    </div>
  );
}

function TableDataBody({
  columns,
  rows,
  ctx,
}: {
  columns: Column[];
  rows: Row[];
  ctx?: ControllerContainerContext;
  // Snapshot mutable action context so memoization cannot retain stale buttons.
  proxy: ControllerContainerContext['proxy'];
  actionAllowed: boolean;
}) {
  return (
    <TableBody className="[&_tr:last-child]:border-b">
      {rows.map(({ data, index }, row) => (
        <TableRow
          key={index}
          className="border-b border-gray-300 hover:bg-gray-50"
        >
          <TableCell
            role="rowheader"
            className="sticky left-0 z-10 w-7 min-w-7 border border-gray-300 bg-gray-100 px-1 py-0.5 text-right align-middle text-gray-600"
          >
            {row}
          </TableCell>
          {columns.map(({ key, binding, delegate, className }, column) => {
            const value = data.getValue(key);
            const props = {
              value,
              binding,
              ctx,
              rowData: data,
              row,
              column,
              header: key,
            };
            const Component = delegate.Component;
            return (
              <TableCell
                key={key}
                style={delegate.getStyle?.(props)}
                className={className}
              >
                {Component ? (
                  <Component {...props} />
                ) : (
                  formatTableCell(value, binding)
                )}
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </TableBody>
  );
}

const MemoizedTableDataBody = React.memo(TableDataBody);
