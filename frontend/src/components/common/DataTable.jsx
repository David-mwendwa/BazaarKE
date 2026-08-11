import { useState, useMemo, useEffect, useCallback } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Button } from '../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { cn } from '../../lib/utils';

const rowId = (row) => row._id || row.id;

/**
 * `hideBelow` on a column drops it under the given breakpoint instead of
 * letting it push the table into horizontal scroll. Between `md` (where the
 * mobile cards stop) and `xl` a dashboard table only has ~600px next to the
 * sidebar, so the secondary columns — vendor, dates — step out first and the
 * ones a vendor acts on stay put.
 *
 * Written out in full because Tailwind scans for literal class strings.
 */
const HIDE_BELOW = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

const SelectionBox = ({ checked, onToggle, label }) => (
  <div className='flex items-center justify-center'>
    <div
      role='checkbox'
      tabIndex={0}
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!checked);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(!checked);
        }
      }}
      className={cn(
        'relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        checked
          ? 'border-primary-600 bg-primary-600'
          : 'border-gray-300 bg-white hover:border-primary-500 dark:border-gray-600 dark:bg-gray-800'
      )}>
      {checked && <Check className='h-3.5 w-3.5 text-white' strokeWidth={3} />}
    </div>
  </div>
);

/**
 * DataTable
 *
 * Two paging modes:
 * - client (default): receives the full dataset, slices and sorts locally.
 * - server: pass `pagination` — the parent owns page/pageSize/total and the
 *   table renders `data` as-is. Sorting is reported through `onSortChange`
 *   instead of being applied locally, so it can't silently sort just the
 *   current page and look like it sorted everything.
 *
 * `mobileCard(row)` renders a stacked card below `md`, where a horizontally
 * scrolling table is unusable. Without it the table scrolls on small screens.
 *
 * Column options: `cell`, `header`, `className` (alignment + `sticky`),
 * `sortable: false`, `sortValue(row)` for client-mode sorting of values the
 * key can't reach, `flexible: true` to take the leftover width, and
 * `hideBelow: 'lg' | 'xl'` to drop a secondary column on narrow desktops.
 */
const DataTable = ({
  columns,
  data = [],
  onRowClick,
  selectedRows: externalSelectedRows = [],
  onSelectRow,
  onSelectAll,
  emptyState = 'No data available',
  className = '',
  rowsPerPageOptions = [10, 20, 50, 100],
  defaultRowsPerPage = 10,
  // Opt-in: a checkbox column is only meaningful next to a bulk action, so
  // each table turns it on deliberately rather than opting out one by one.
  enableRowSelection = false,
  pagination,
  sort,
  onSortChange,
  mobileCard,
}) => {
  const serverMode = Boolean(pagination);

  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(defaultRowsPerPage);
  const [localSort, setLocalSort] = useState({ key: '', direction: 'ascending' });
  const [internalSelectedRows, setInternalSelectedRows] = useState([]);

  const activeSort = useMemo(
    () => (serverMode ? sort || { key: '', direction: 'ascending' } : localSort),
    [serverMode, sort, localSort]
  );

  const sortedData = useMemo(() => {
    if (serverMode || !activeSort.key) return data || [];
    const column = columns.find((c) => c.key === activeSort.key);

    return [...(data || [])].sort((a, b) => {
      // The key doubles as a path: `total.amount` has to be walked, not read
      // as a literal property, or every value comes back `undefined` and the
      // comparator quietly returns the rows in their original order — a
      // header that looks sortable and does nothing.
      const read = (row) => {
        if (column?.sortValue) return column.sortValue(row);
        return (column?.accessorKey || activeSort.key).split('.').reduce((o, k) => o?.[k], row);
      };
      let aValue = read(a);
      let bValue = read(b);

      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return activeSort.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return activeSort.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [data, activeSort, columns, serverMode]);

  const currentPage = serverMode ? pagination.page : localPage;
  const pageSize = serverMode ? pagination.pageSize : localPageSize;
  const totalItems = serverMode ? pagination.totalItems : sortedData.length;
  const totalPages = serverMode
    ? pagination.totalPages || Math.ceil(totalItems / pageSize) || 1
    : Math.ceil(totalItems / pageSize) || 1;

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = serverMode ? sortedData : sortedData.slice(startIndex, startIndex + pageSize);

  const selectedRows = onSelectRow ? externalSelectedRows : internalSelectedRows;
  const allSelected = paginatedData.length > 0 && paginatedData.every((row) => selectedRows.includes(rowId(row)));

  const toggleSelectAll = useCallback(
    (checked) => {
      if (onSelectAll) return onSelectAll(checked);
      const pageIds = paginatedData.map(rowId);
      setInternalSelectedRows((prev) =>
        checked ? [...new Set([...prev, ...pageIds])] : prev.filter((id) => !pageIds.includes(id))
      );
    },
    [onSelectAll, paginatedData]
  );

  const toggleSelectRow = useCallback(
    (id, checked) => {
      if (onSelectRow) return onSelectRow(id, checked);
      setInternalSelectedRows((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
    },
    [onSelectRow]
  );

  const requestSort = (key) => {
    const direction =
      activeSort.key === key && activeSort.direction === 'ascending' ? 'descending' : 'ascending';
    if (serverMode) onSortChange?.({ key, direction });
    else setLocalSort({ key, direction });
  };

  const goToPage = (page) => {
    const next = Math.max(1, Math.min(page, totalPages));
    if (serverMode) pagination.onPageChange?.(next);
    else setLocalPage(next);
  };

  const changePageSize = (value) => {
    const size = Number(value);
    if (serverMode) pagination.onPageSizeChange?.(size);
    else {
      setLocalPageSize(size);
      setLocalPage(1);
    }
  };

  // Client mode only: a new dataset (e.g. a filter changed) invalidates the
  // current page. In server mode the parent owns that reset.
  useEffect(() => {
    if (!serverMode) setLocalPage(1);
  }, [data, localPageSize, serverMode]);

  const tableColumns = useMemo(() => {
    const base = Array.isArray(columns) ? columns : [];
    if (!enableRowSelection) return base;
    return [
      {
        key: '__select__',
        header: <SelectionBox checked={allSelected} onToggle={toggleSelectAll} label='Select all rows' />,
        cell: (row) => (
          <SelectionBox
            checked={selectedRows.includes(rowId(row))}
            onToggle={(checked) => toggleSelectRow(rowId(row), checked)}
            label={`Select ${row.name || 'row'}`}
          />
        ),
        sortable: false,
        // Wide enough for the 20px box plus the table's own left gutter, so
        // the checkbox lines up with the text of the column below it rather
        // than hugging the card's border. `pr-0` on the right is handled by
        // Table.jsx's `[&:has([role=checkbox])]:pr-0` rule.
        className: 'w-12 pl-4',
      },
      ...base,
    ];
  }, [columns, enableRowSelection, allSelected, selectedRows, toggleSelectAll, toggleSelectRow]);

  /**
   * In an auto-layout table, leftover width is shared out between all columns,
   * so short ones like Status drift away from their neighbours and leave gaps
   * mid-row. Pinning one column to `w-full` makes it swallow the slack instead
   * and lets everything else shrink to its content.
   *
   * The first content column is the right one to stretch — it's the name or
   * reference, the longest and most truncation-tolerant value in every table
   * here. A column can opt in explicitly with `flexible: true`.
   */
  const flexibleKey = useMemo(() => {
    const content = tableColumns.filter((column) => column.key !== '__select__');
    return (content.find((column) => column.flexible) || content[0])?.key;
  }, [tableColumns]);

  const alignmentOf = (column) =>
    column.className?.includes('text-right')
      ? 'text-right'
      : column.className?.includes('text-center')
        ? 'text-center'
        : 'text-left';

  const isEmpty = paginatedData.length === 0;

  return (
    <div className='flex flex-col'>
      {/* Desktop / tablet: full table */}
      <div className={cn(mobileCard && 'hidden md:block', className)}>
        <Table>
          <TableHeader className='bg-gray-50 dark:bg-gray-900'>
            <TableRow className='border-b border-gray-200 hover:bg-transparent dark:border-gray-700'>
              {tableColumns.map((column) => {
                const align = alignmentOf(column);
                const isSorted = activeSort.key === column.key;
                const sortable = column.sortable !== false;

                return (
                  <TableHead
                    key={column.key}
                    className={cn(
                      'px-4 font-semibold text-gray-900 dark:text-gray-100',
                      column.key === flexibleKey && 'w-full',
                      align,
                      column.hideBelow && HIDE_BELOW[column.hideBelow],
                      column.className?.includes('sticky') &&
                        'sticky right-0 bg-gray-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.08)] dark:bg-gray-900',
                      column.className
                    )}>
                    {sortable ? (
                      <button
                        type='button'
                        onClick={() => requestSort(column.key)}
                        className={cn(
                          'flex w-full items-center gap-1 rounded-md hover:text-primary-700 dark:hover:text-primary-400',
                          align === 'text-right' && 'justify-end',
                          align === 'text-center' && 'justify-center'
                        )}>
                        <span>{column.header}</span>
                        <ArrowUpDown className={cn('h-3 w-3', isSorted ? 'opacity-100' : 'opacity-40')} />
                        {isSorted && (
                          <span className='text-xs leading-none'>
                            {activeSort.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    ) : (
                      <div className={align}>{column.header}</div>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell
                  colSpan={Math.max(1, tableColumns.length)}
                  className='h-24 whitespace-normal bg-white text-center text-muted-foreground dark:bg-gray-800'>
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, i) => (
                <TableRow
                  key={rowId(row) || `row-${i}`}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-gray-100 bg-white last:border-0 dark:border-gray-700 dark:bg-gray-800',
                    onRowClick && 'cursor-pointer'
                  )}>
                  {tableColumns.map((column) => (
                    <TableCell
                      key={`${rowId(row) || i}-${column.key}`}
                      className={cn(
                        'px-4',
                        column.key === flexibleKey && 'w-full',
                        alignmentOf(column),
                        column.hideBelow && HIDE_BELOW[column.hideBelow],
                        column.className?.includes('sticky') &&
                          'sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.08)] dark:bg-gray-800',
                        column.cellClassName
                      )}>
                      {column.cell
                        ? column.cell(row)
                        : (row[column.key] ?? <span className='text-muted-foreground/50'>—</span>)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards — a 6-column table is unreadable under ~768px */}
      {mobileCard && (
        <div className='divide-y divide-gray-100 md:hidden dark:divide-gray-700'>
          {isEmpty ? (
            <div className='px-4 py-10 text-center text-sm text-muted-foreground'>{emptyState}</div>
          ) : (
            paginatedData.map((row, i) => (
              <div
                key={rowId(row) || `card-${i}`}
                onClick={() => onRowClick?.(row)}
                className={cn('bg-white p-4 dark:bg-gray-800', onRowClick && 'cursor-pointer')}>
                <div className='flex items-start gap-3'>
                  {enableRowSelection && (
                    <div className='pt-0.5'>
                      <SelectionBox
                        checked={selectedRows.includes(rowId(row))}
                        onToggle={(checked) => toggleSelectRow(rowId(row), checked)}
                        label={`Select ${row.name || 'row'}`}
                      />
                    </div>
                  )}
                  <div className='min-w-0 flex-1'>{mobileCard(row)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination — hidden when everything fits on one page */}
      {(totalPages > 1 || totalItems > rowsPerPageOptions[0]) && (
        <div className='flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row dark:border-gray-700 dark:bg-gray-800'>
          <div className='flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400'>
            <span className='tabular-nums'>
              {totalItems > 0
                ? `${startIndex + 1}–${Math.min(startIndex + pageSize, totalItems)} of ${totalItems}`
                : 'No items'}
            </span>
            <Select value={String(pageSize)} onValueChange={changePageSize}>
              <SelectTrigger className='h-8 w-[72px]'>
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent>
                {rowsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center gap-1'>
            {[
              { icon: ChevronsLeft, to: 1, label: 'First page', disabled: currentPage === 1 },
              { icon: ChevronLeft, to: currentPage - 1, label: 'Previous page', disabled: currentPage === 1 },
            ].map(({ icon: Icon, to, label, disabled }) => (
              <Button
                key={label}
                variant='ghost'
                size='sm'
                onClick={() => goToPage(to)}
                disabled={disabled}
                className='h-9 w-9 p-0 text-gray-700 disabled:opacity-40 dark:text-gray-300'>
                <Icon className='h-4 w-4' />
                <span className='sr-only'>{label}</span>
              </Button>
            ))}

            <span className='px-3 text-sm tabular-nums text-gray-700 dark:text-gray-300'>
              {currentPage} / {totalPages}
            </span>

            {[
              { icon: ChevronRight, to: currentPage + 1, label: 'Next page', disabled: currentPage >= totalPages },
              { icon: ChevronsRight, to: totalPages, label: 'Last page', disabled: currentPage >= totalPages },
            ].map(({ icon: Icon, to, label, disabled }) => (
              <Button
                key={label}
                variant='ghost'
                size='sm'
                onClick={() => goToPage(to)}
                disabled={disabled}
                className='h-9 w-9 p-0 text-gray-700 disabled:opacity-40 dark:text-gray-300'>
                <Icon className='h-4 w-4' />
                <span className='sr-only'>{label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
