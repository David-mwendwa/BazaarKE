import React, { useEffect } from 'react';

// Inline styles for the shimmer effect
const shimmerStyle = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .shimmer-wrapper {
    position: relative;
    overflow: hidden;
    background-color: #f3f4f6;
  }
  
  .dark .shimmer-wrapper {
    background-color: #374151;
  }
  
  .shimmer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }
`;

const ContentSkeleton = ({
  // Layout
  variant = 'table', // 'table' | 'card' | 'stats' | 'analytics'
  className = '',

  // Header
  showHeaderSection = true,
  headerTitleWidth = 'w-48',
  headerSubtitleWidth = 'w-64',
  headerActionWidth = 'w-32',

  // Table
  showTable = false,
  rows = 6,
  columns = 6,
  hasCheckboxes = true,
  hasActions = true,
  showHeader = true,
  showFilters = true,
  showPagination = true,
  rowHeight = 'h-16',
  headerHeight = 'h-12',
  cellPadding = 'px-4 py-3',

  // Stats
  showStats = false,
  cardCount = 4,
  statCardLayout = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',

  // Charts
  showCharts = false,
  chartHeight = 'h-64',
  chartLayout = 'grid-cols-1 lg:grid-cols-2',
  chartCount = 2,
}) => {
  // Add the styles to the document head
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const styleElement = document.createElement('style');
      styleElement.textContent = shimmerStyle;
      document.head.appendChild(styleElement);

      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, []);

  // Create a shimmer element
  const Shimmer = () => <span className='shimmer' />;

  const renderStatsCards = () => (
    <div className={`grid ${statCardLayout} gap-4 mb-6`}>
      {[...Array(cardCount)].map((_, i) => (
        <div
          key={i}
          className='p-4 bg-white dark:bg-gray-800 rounded-lg shadow'>
          <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-24 mb-2 shimmer-wrapper'>
            <Shimmer />
          </div>
          <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-16 shimmer-wrapper'>
            <Shimmer />
          </div>
          <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-32 mt-2 shimmer-wrapper'>
            <Shimmer />
          </div>
        </div>
      ))}
    </div>
  );

  const renderCharts = () => (
    <div className={`grid ${chartLayout} gap-6 mb-6`}>
      {[...Array(chartCount)].map((_, i) => (
        <div
          key={i}
          className={`${chartHeight} bg-white dark:bg-gray-800 rounded-lg shadow p-4 shimmer-wrapper`}>
          <Shimmer />
        </div>
      ))}
    </div>
  );

  const renderTable = () => (
    <div className='w-full overflow-hidden'>
      {/* Search and Filter Bar */}
      <div className='flex items-center justify-between w-full mb-4'>
        <div className='relative h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-1/4 shimmer-wrapper overflow-hidden'>
          <Shimmer />
        </div>
        <div className='flex space-x-2'>
          <div className='relative h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
            <Shimmer />
          </div>
          <div className='relative h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
            <Shimmer />
          </div>
        </div>
      </div>
      <div className='rounded-md border dark:border-gray-700 overflow-hidden'>
        {/* Pagination Controls */}
        {showFilters && (
          <div className='px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-16 shimmer-wrapper overflow-hidden'>
                  <Shimmer />
                </div>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-12 shimmer-wrapper overflow-hidden'>
                  <Shimmer />
                </div>
              </div>
              <div className='flex items-center space-x-2'>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-12 shimmer-wrapper overflow-hidden'>
                  <Shimmer />
                </div>
                <div className='relative'>
                  <div className='h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
                    <Shimmer />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Table Header */}
        {showHeader && (
          <div
            className={`flex ${cellPadding} ${headerHeight} items-center bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700`}>
            {/* Checkbox column - always first */}
            {hasCheckboxes && (
              <div className='flex-shrink-0 mr-6'>
                <div className='relative h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
                  <Shimmer />
                </div>
              </div>
            )}
            {/* Data columns - takes remaining space */}
            <div className='flex-1 flex items-center'>
              {/* First column title - takes 1/3 of the width */}
              <div className='w-1/3 pr-4'>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4 shimmer-wrapper overflow-hidden'>
                  <Shimmer />
                </div>
              </div>
              {/* Middle columns - take remaining 2/3 */}
              <div className='w-2/3 flex justify-between'>
                {Array.from({
                  length:
                    columns -
                    (hasCheckboxes ? 1 : 0) -
                    (hasActions ? 1 : 0) -
                    1,
                }).map((_, colIndex) => (
                  <div key={colIndex} className='flex-1 px-2 text-center'>
                    <div
                      className='h-4 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden mx-auto'
                      style={{ maxWidth: '80%' }}>
                      <Shimmer />
                    </div>
                  </div>
                ))}
              </div>
              {/* Actions column - always last */}
              {hasActions && (
                <div className='ml-8 flex-shrink-0'>
                  <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-16 shimmer-wrapper overflow-hidden'>
                    <Shimmer />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Table Rows */}
<div className='divide-y dark:divide-gray-700'>
  {Array.from({ length: rows }).map((_, rowIndex) => (
    <div
      key={rowIndex}
      className={`flex ${cellPadding} ${rowHeight} items-center hover:bg-gray-50 dark:hover:bg-gray-800/50`}>
      {/* Checkbox column - always first */}
      {hasCheckboxes && (
        <div className='flex-shrink-0 mr-6'>
          <div className='relative h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
            <Shimmer />
          </div>
        </div>
      )}
      {/* Data cells - takes remaining space */}
      <div className='flex-1 flex items-center'>
        {/* First column content - takes 1/3 of the width */}
        <div className='w-1/3 pr-4'>
          <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-1/2 shimmer-wrapper overflow-hidden'>
            <Shimmer />
          </div>
          <div className='h-3 bg-gray-100 dark:bg-gray-700 rounded-md mt-1 shimmer-wrapper overflow-hidden'>
            <Shimmer />
          </div>
        </div>
        {/* Middle columns - take remaining 2/3 */}
        <div className='w-2/3 flex justify-between'>
          {Array.from({
            length: columns - (hasCheckboxes ? 1 : 0) - (hasActions ? 1 : 0) - 1,
          }).map((_, colIndex) => (
            <div key={colIndex} className='flex-1 px-2 text-center'>
              <div
                className='h-4 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden mx-auto'
                style={{ maxWidth: '80%' }}>
                <Shimmer />
              </div>
            </div>
          ))}
        </div>
        {/* Actions column - always last */}
        {hasActions && (
          <div className='ml-8 flex-shrink-0 flex space-x-2'>
            <div className='h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
              <Shimmer />
            </div>
          </div>
        )}
      </div>
    </div>
  ))}
</div>
      </div>
      {/* Pagination */}
      {showPagination && (
        <div className='flex items-center justify-between mt-4'>
          <div className='relative h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-32 shimmer-wrapper overflow-hidden'>
            <Shimmer />
          </div>
          <div className='flex space-x-2'>
            <div className='h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
              <Shimmer />
            </div>
            <div className='h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
              <Shimmer />
            </div>
            <div className='relative h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
              <Shimmer />
            </div>
            <div className='h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
              <Shimmer />
            </div>
            <div className='h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-md shimmer-wrapper overflow-hidden'>
              <Shimmer />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      {showHeaderSection && (
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <div
              className={`h-8 bg-gray-200 dark:bg-gray-700 rounded-md ${headerTitleWidth} mb-2 shimmer-wrapper overflow-hidden`}>
              <Shimmer />
            </div>
            {headerSubtitleWidth && (
              <div
                className={`h-4 bg-gray-200 dark:bg-gray-700 rounded-md ${headerSubtitleWidth} shimmer-wrapper overflow-hidden`}>
                <Shimmer />
              </div>
            )}
          </div>
          {headerActionWidth && (
            <div
              className={`h-10 bg-gray-200 dark:bg-gray-700 rounded-md ${headerActionWidth} shimmer-wrapper overflow-hidden`}>
              <Shimmer />
            </div>
          )}
        </div>
      )}

      {/* Render based on variant */}
      {variant === 'table' && showTable && renderTable()}
      {variant === 'card' && showStats && renderStatsCards()}
      {/* `stats` was listed in the variant prop's own doc comment but had no
          branch here, so asking for it rendered the header placeholder and
          nothing else. It's `analytics` without the charts — which is exactly
          what the two dashboard overviews are. */}
      {variant === 'stats' && (
        <>
          {showStats && renderStatsCards()}
          {showTable && renderTable()}
        </>
      )}
      {variant === 'analytics' && (
        <>
          {showStats && renderStatsCards()}
          {showCharts && renderCharts()}
          {showTable && renderTable()}
        </>
      )}
    </div>
  );
};

export default ContentSkeleton;
