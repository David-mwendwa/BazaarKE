import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { ArrowUpDown } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const DataTable = ({
  columns,
  data = [],
  onRowClick,
  selectedRows: externalSelectedRows = [],
  onSelectRow,
  onSelectAll,
  emptyState = 'No data available',
  className = '',
  rowsPerPageOptions = [10, 20, 30, 50, 100],
  defaultRowsPerPage = 10,
  enableRowSelection = true, // New prop to enable/disable row selection
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [sortConfig, setSortConfig] = useState({
    key: '',
    direction: 'ascending',
  });

  // Internal state for selected rows if not controlled
  const [internalSelectedRows, setInternalSelectedRows] = useState([]);

  // Sort data based on sortConfig
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !data) return data || [];

    // Find the column configuration for the sort key
    const column = columns.find((col) => col.key === sortConfig.key);

    return [...(data || [])].sort((a, b) => {
      let aValue, bValue;

      // Use custom sortValue function if provided
      if (column?.sortValue) {
        aValue = column.sortValue(a);
        bValue = column.sortValue(b);
      } else if (column?.accessorKey) {
        // Use accessorKey if available (supports nested paths like 'total.amount')
        const accessor = column.accessorKey.split('.');
        aValue = accessor.reduce((obj, key) => obj?.[key], a);
        bValue = accessor.reduce((obj, key) => obj?.[key], b);
      } else {
        // Fallback to direct key access
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      // Handle different data types for sorting
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, columns]);

  // Remove duplicate sortedData declaration if it exists elsewhere in the file

  // Calculate pagination data
  const { totalItems, totalPages, startIndex, endIndex, paginatedData } =
    useMemo(() => {
      const total = sortedData?.length || 0;
      const pages = Math.ceil(total / rowsPerPage) || 1;
      const start = (currentPage - 1) * rowsPerPage;
      const end = Math.min(start + rowsPerPage, total);
      const pageData = sortedData?.slice(start, end) || [];

      return {
        totalItems: total,
        totalPages: pages,
        startIndex: start,
        endIndex: end,
        paginatedData: pageData,
      };
    }, [sortedData, currentPage, rowsPerPage]);

  // Use external selected rows if provided, otherwise use internal state
  const selectedRows = onSelectRow
    ? externalSelectedRows
    : internalSelectedRows;

  // Debug logging
  useEffect(() => {
    console.log('DataTable rendering with:', {
      columns: columns?.length || 0,
      data: data?.length || 0,
      hasOnRowClick: !!onRowClick,
      selectedRows: selectedRows?.length || 0,
      hasOnSelectRow: !!onSelectRow,
      hasOnSelectAll: !!onSelectAll,
      className,
    });

    if (data?.length > 0) {
      console.log('First data item:', data[0]);
    }
  }, [
    columns,
    data,
    onRowClick,
    onSelectRow,
    onSelectAll,
    selectedRows,
    className,
  ]);

  // Determine if all rows on current page are selected
  const allSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row) => selectedRows.includes(row._id || row.id));

  // Toggle all rows selection
  const toggleSelectAll = useCallback(
    (checked) => {
      if (onSelectAll) {
        onSelectAll(checked);
      } else {
        setInternalSelectedRows((prev) => {
          const pageIds = paginatedData.map((row) => row._id || row.id);
          if (checked) {
            return [...new Set([...prev, ...pageIds])];
          } else {
            return prev.filter((id) => !pageIds.includes(id));
          }
        });
      }
    },
    [onSelectAll, paginatedData],
  );

  // Toggle single row selection
  const toggleSelectRow = useCallback(
    (rowId, checked) => {
      if (onSelectRow) {
        onSelectRow(rowId, checked);
      } else {
        setInternalSelectedRows((prev) =>
          checked ? [...prev, rowId] : prev.filter((id) => id !== rowId),
        );
      }
    },
    [onSelectRow],
  );

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Only show the legacy checkbox column if enableRowSelection is false
  // When enableRowSelection is true, the checkbox is added via safeColumns
  const showSelectColumn = !enableRowSelection && (onSelectAll || onSelectRow);

  // Make sure columns is an array
  const safeColumns = useMemo(() => {
    if (!columns || !Array.isArray(columns)) return [];

    // Add checkbox column if row selection is enabled
    const columnsToRender = [];

    if (enableRowSelection) {
      columnsToRender.push({
        key: '__select__',
        header: (
          <div className='flex items-center justify-center'>
            <div
              className={cn(
                'relative flex h-5 w-5 items-center justify-center rounded border transition-colors',
                allSelected
                  ? 'border-primary bg-primary'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
                'cursor-pointer hover:border-primary dark:hover:border-primary',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900',
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectAll(!allSelected);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSelectAll(!allSelected);
                }
              }}
              tabIndex={0}
              role='checkbox'
              aria-checked={allSelected}
              aria-label='Select all rows'>
              {allSelected && (
                <svg
                  className='h-3.5 w-3.5 text-white dark:text-gray-900'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={3}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
              )}
            </div>
          </div>
        ),
        cell: (row) => {
          const isSelected = selectedRows.includes(row._id || row.id);
          return (
            <div className='flex items-center justify-center'>
              <div
                className={cn(
                  'relative flex h-5 w-5 items-center justify-center rounded border transition-colors',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
                  'cursor-pointer hover:border-primary dark:hover:border-primary',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelectRow(row._id || row.id, !isSelected);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSelectRow(row._id || row.id, !isSelected);
                  }
                }}
                tabIndex={0}
                role='checkbox'
                aria-checked={isSelected}
                aria-label={`Select row ${row._id || row.id}`}>
                {isSelected && (
                  <svg
                    className='h-3.5 w-3.5 text-white dark:text-gray-900'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={3}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                )}
              </div>
            </div>
          );
        },
        sortable: false,
        className: 'w-12',
        cellClassName: 'text-center',
      });
    }

    // Add the rest of the columns
    return [
      ...columnsToRender,
      ...columns.map((col) => ({
        key: col.key || '',
        header: col.header || '',
        sortable: col.sortable !== false,
        className: col.className || '',
        cellClassName: col.cellClassName || '',
        style: col.style || {},
        cellStyle: col.cellStyle || {},
        render: col.render,
        cell: col.cell,
      })),
    ];
  }, [
    columns,
    selectedRows,
    allSelected,
    enableRowSelection,
    toggleSelectAll,
    toggleSelectRow,
  ]);

  // Handle page change
  const goToPage = (page) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (value) => {
    const newRowsPerPage = Number(value);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data, rowsPerPage]);

  // Debug: Log when component renders
  useEffect(() => {
    console.log('DataTable mounted with data:', {
      dataLength: data?.length,
      columns: safeColumns.map((c) => c.key),
      hasData: data && data.length > 0,
      hasColumns: safeColumns.length > 0,
      currentPage,
      rowsPerPage,
      totalPages,
      startIndex,
      endIndex,
    });
  }, [
    data,
    safeColumns,
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
  ]);

  return (
    <div className='space-y-0'>
      {/* Top pagination bar */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-md'>
        {/* Total items count */}
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          Total: {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </div>

        {/* Rows per page selector */}
        <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
          <span>Show:</span>
          <Select
            value={rowsPerPage.toString()}
            onValueChange={handleRowsPerPageChange}>
            <SelectTrigger className='h-8 w-[80px]'>
              <SelectValue placeholder={rowsPerPage} />
            </SelectTrigger>
            <SelectContent>
              {rowsPerPageOptions.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>
      </div>

      <div
        className={`rounded-md border bg-white dark:bg-gray-800/50 ${className}`}>
        <Table>
          <TableHeader className='bg-gray-50 dark:bg-gray-900'>
            <TableRow className='border-b border-gray-200 dark:border-gray-700'>
              {showSelectColumn && (
                <TableHead className='w-[50px] bg-gray-50 dark:bg-gray-900'>
                  {onSelectAll && (
                    <input
                      type='checkbox'
                      checked={allSelected}
                      onChange={(e) => onSelectAll(e.target.checked)}
                      className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                      aria-label='Select all'
                    />
                  )}
                </TableHead>
              )}
              {safeColumns.length > 0 ? (
                safeColumns.map((column) => {
                  const sortable = column.sortable !== false; // Default to true if not specified
                  const isSorted = sortConfig.key === column.key;

                  return (
                    <TableHead
                      key={column.key}
                      className={cn(
                        'px-4 font-semibold bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                        column.className || '',
                        {
                          'text-left': !column.cellClassName?.includes('text-'),
                          'text-center':
                            column.cellClassName?.includes('text-center'),
                          'text-right':
                            column.cellClassName?.includes('text-right'),
                        },
                      )}
                      style={column.style}>
                      {sortable ? (
                        <div
                          className={`flex items-center gap-1 cursor-pointer ${
                            column.cellClassName?.includes('text-right')
                              ? 'justify-end'
                              : column.cellClassName?.includes('text-center')
                                ? 'justify-center'
                                : 'justify-start'
                          } ${column.headerClassName || ''}`}
                          onClick={() => requestSort(column.key)}>
                          <span>{column.header}</span>
                          <div className='flex flex-col'>
                            <ArrowUpDown className='h-3 w-3 opacity-50' />
                            {isSorted && (
                              <span className='text-xs leading-3'>
                                {sortConfig.direction === 'ascending'
                                  ? '↑'
                                  : '↓'}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={
                            column.cellClassName?.includes('text-center')
                              ? 'text-center'
                              : column.cellClassName?.includes('text-right')
                                ? 'text-right'
                                : 'text-left'
                          }>
                          {column.header}
                        </div>
                      )}
                    </TableHead>
                  );
                })
              ) : (
                <TableHead>No columns defined</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData && paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={row._id || row.id || `row-${rowIndex}`}
                  className={cn(
                    onRowClick &&
                      'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50',
                    'bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-0',
                  )}
                  onClick={() => onRowClick?.(row)}>
                  {/* Only show legacy checkbox cell if enableRowSelection is false */}
                  {!enableRowSelection && onSelectRow && (
                    <TableCell>
                      <input
                        type='checkbox'
                        checked={
                          row._id || row.id
                            ? selectedRows.includes(row._id || row.id)
                            : false
                        }
                        onChange={(e) =>
                          onSelectRow(row._id || row.id, e.target.checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                        aria-label={`Select ${row.name || 'item'}`}
                      />
                    </TableCell>
                  )}
                  {safeColumns.map((column) => (
                    <TableCell
                      key={`${row._id || row.id || `row-${rowIndex}`}-${column.key}`}
                      className={cn('px-4', column.cellClassName || '', {
                        'text-left': !column.cellClassName?.includes('text-'),
                        'text-center':
                          column.cellClassName?.includes('text-center'),
                        'text-right':
                          column.cellClassName?.includes('text-right'),
                      })}
                      style={column.cellStyle}>
                      {column.cell
                        ? column.cell(row)
                        : column.render
                          ? column.render(row) || (
                              <span className='text-muted-foreground/50'>
                                -
                              </span>
                            )
                          : row[column.key] || (
                              <span className='text-muted-foreground/50'>
                                -
                              </span>
                            )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={Math.max(
                    1,
                    safeColumns.length + (showSelectColumn ? 1 : 0),
                  )}
                  className='h-24 text-center text-muted-foreground bg-white dark:bg-gray-800'>
                  {emptyState}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-md'>
        {/* Page info */}
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          {totalItems > 0
            ? `Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems} items`
            : 'No items to display'}
        </div>

        {/* Pagination controls */}
        <div className='flex items-center gap-1.5'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className='h-10 w-10 p-0 flex items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'>
            <ChevronsLeft className='h-5 w-5' />
            <span className='sr-only'>First page</span>
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className='h-10 w-10 p-0 flex items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'>
            <ChevronLeft className='h-5 w-5' />
            <span className='sr-only'>Previous page</span>
          </Button>

          <div className='flex items-center h-10 px-4 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              {currentPage}
            </span>
            <span className='mx-1 text-gray-400'>/</span>
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              {totalPages}
            </span>
          </div>

          <Button
            variant='ghost'
            size='sm'
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className='h-10 w-10 p-0 flex items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'>
            <ChevronRight className='h-5 w-5' />
            <span className='sr-only'>Next page</span>
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => goToPage(totalPages)}
            disabled={currentPage >= totalPages}
            className='h-10 w-10 p-0 flex items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'>
            <ChevronsRight className='h-5 w-5' />
            <span className='sr-only'>Last page</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
