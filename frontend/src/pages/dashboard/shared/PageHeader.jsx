import React from 'react';
import { Button } from '../../../components/ui/Button';
import { X, ChevronDown, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/DropdownMenu';

/**
 * PageHeader Component
 *
 * A reusable header component for dashboard pages that includes:
 * - Page title and description
 * - Action buttons (Add, Clear Filters, etc.)
 * - Bulk action dropdown for selected items
 * - Custom content area for search/filter controls
 *
 * @component
 * @example
 * // Example usage:
 * <PageHeader
 *   title="Users"
 *   description="Manage user accounts"
 *   onAdd={handleAddUser}
 *   showClearFilters={hasFilters}
 *   onClearFilters={resetFilters}
 *   selectedCount={selectedUsers.length}
 *   onClearSelection={clearSelection}
 *   bulkActions={[
 *     { value: 'delete', label: 'Delete', icon: Trash2, destructive: true }
 *   ]}
 * >
 *   <div>Search and filter controls go here</div>
 * </PageHeader>
 *
 * @param {Object} props - Component props
 * @param {string} props.title - The main page title
 * @param {string} [props.description] - Optional description text below the title
 * @param {Function} [props.onAdd] - Callback for the add button click
 * @param {string} [props.addButtonLabel='Add'] - Label for the add button
 * @param {React.ReactNode} [props.children] - Optional content to render below the header
 * @param {boolean} [props.showClearFilters=false] - Whether to show the clear filters button
 * @param {Function} [props.onClearFilters] - Callback for clearing filters
 * @param {number} [props.selectedCount=0] - Number of selected items for bulk actions
 * @param {Function} [props.onClearSelection] - Callback for clearing selection
 * @param {Function} [props.onBulkAction] - Callback for bulk actions
 * @param {Array<Object>} [props.bulkActions=[]] - Array of bulk action options
 * @param {boolean} [props.showActions=true] - Whether to show action buttons
 */
export function PageHeader({
  title,
  description,
  onAdd,
  addButtonLabel = 'Add',
  children,
  showClearFilters = false,
  onClearFilters,
  selectedCount = 0,
  onClearSelection,
  onBulkAction,
  bulkActions = [],
  showActions = true,
}) {
  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='flex flex-col space-y-2'>
        <div className='flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-1'>
            <h2 className='text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl'>
              {title}
            </h2>
            {description && (
              <p className='text-sm text-gray-500 dark:text-gray-400 sm:text-base'>
                {description}
              </p>
            )}
          </div>
          <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
            {selectedCount > 0 && (
              <div className='flex w-full items-center justify-between sm:w-auto sm:justify-start'>
                <span className='text-sm text-gray-500 dark:text-gray-400 sm:mr-2'>
                  {selectedCount} selected
                </span>
                <div className='flex items-center space-x-1 sm:space-x-2'>
                  {showActions && bulkActions.length > 0 && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-8 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 sm:h-9'>
                            <span className='sr-only sm:not-sr-only'>
                              Actions
                            </span>
                            <ChevronDown className='ml-0 h-4 w-4 sm:ml-2' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align='end'
                          className='border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'>
                          {bulkActions.map((action) => (
                            <DropdownMenuItem
                              key={action.value}
                              className={`${
                                action.destructive
                                  ? 'text-red-600 hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 dark:focus:bg-red-900/30'
                                  : 'text-gray-900 hover:bg-gray-50 focus:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-700'
                              }`}
                              onSelect={() => onBulkAction?.(action.value)}>
                              {action.icon && (
                                <action.icon className='mr-2 h-4 w-4' />
                              )}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={onClearSelection}
                        className='h-8 px-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 sm:h-9 sm:px-3'
                        aria-label='Clear selection'>
                        <X className='h-4 w-4' />
                        <span className='sr-only sm:not-sr-only sm:ml-1'>
                          Clear Selection
                        </span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className='flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end'>
              {showClearFilters && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={onClearFilters}
                  className='h-8 px-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 sm:h-9 sm:px-3'>
                  <X className='h-4 w-4 sm:mr-1' />
                  <span className='sr-only sm:not-sr-only sm:ml-1'>
                    Clear filters
                  </span>
                </Button>
              )}
              {onAdd && (
                <Button
                  onClick={onAdd}
                  size='sm'
                  className='h-8 flex-1 bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-500 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:focus-visible:ring-gray-400 sm:h-9 sm:flex-initial'>
                  <Plus className='h-4 w-4 sm:mr-2' />
                  <span className='sr-only sm:not-sr-only'>
                    {addButtonLabel}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
        {children && <div className='pt-2'>{children}</div>}
      </div>
    </div>
  );
}

/**
 * Filter toolbar for list pages: stacks full-width on mobile, sits inline
 * from `sm` up. Controls were previously fixed-width and overflowed narrow
 * screens.
 */
export const PageHeaderFilters = ({ children }) => (
  <div className='flex flex-col gap-2 pt-4 sm:flex-row sm:flex-wrap sm:items-center'>{children}</div>
);
