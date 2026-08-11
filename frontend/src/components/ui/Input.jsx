import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(
  (
    {
      className = '',
      label,
      error,
      startIcon: StartIcon,
      endIcon: EndIcon,
      ...props
    },
    ref
  ) => {
    const inputClasses = cn(
      // Border/ring come from the tokens (see index.css) rather than literal
      // colours, so every field on a form focuses identically.
      'flex h-10 w-full rounded-md border border-input bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm ring-offset-background px-3 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      {
        'pl-10': StartIcon,
        'pr-10': EndIcon,
        'border-red-500': error,
      },
      className
    );

    return (
      <div className='space-y-1 w-full'>
        <div className='relative'>
          {StartIcon && (
            <div className='absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-5'>
              {React.isValidElement(StartIcon) ? (
                React.cloneElement(StartIcon, {
                  className: `${StartIcon.props.className || ''} h-5 w-5 ${error ? 'text-red-500' : 'text-gray-400'}`,
                })
              ) : (
                <StartIcon
                  className={`h-5 w-5 ${error ? 'text-red-500' : 'text-gray-400'}`}
                />
              )}
            </div>
          )}
          {label && (
            <label
              htmlFor={props.id}
              className='absolute left-3 -top-2 px-1 text-xs font-medium bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all duration-200 pointer-events-none'>
              {label}
            </label>
          )}
          <input
            ref={ref}
            className={inputClasses}
            style={{
              paddingLeft: StartIcon ? '2.5rem' : undefined,
              paddingRight: EndIcon ? '2.5rem' : undefined,
            }}
            {...props}
          />
          {EndIcon && (
            <div className='absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-5'>
              {React.isValidElement(EndIcon) ? (
                React.cloneElement(EndIcon, {
                  className: `${EndIcon.props.className || ''} h-5 w-5 ${error ? 'text-red-500' : 'text-gray-400'}`,
                })
              ) : (
                <EndIcon
                  className={`h-5 w-5 ${error ? 'text-red-500' : 'text-gray-400'}`}
                />
              )}
            </div>
          )}
        </div>
        {error && (
          <p className='mt-1 text-xs text-red-600 dark:text-red-400'>{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

const Select = React.forwardRef(
  ({ className = '', label, error, options, ...props }, ref) => {
    const selectClasses = cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      {
        'border-red-500': error,
      },
      className
    );

    return (
      <div className='space-y-1 w-full'>
        {label && (
          <label
            htmlFor={props.id}
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            {label}
          </label>
        )}
        <select ref={ref} className={selectClasses} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className='mt-1 text-sm text-red-600 dark:text-red-400'>{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

const Textarea = React.forwardRef(
  ({ className = '', label, error, ...props }, ref) => {
    const textareaClasses = cn(
      'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      {
        'border-red-500': error,
      },
      className
    );

    return (
      <div className='space-y-1 w-full'>
        {label && (
          <label
            htmlFor={props.id}
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            {label}
          </label>
        )}
        <div className='relative'>
          <textarea ref={ref} className={textareaClasses} {...props} />
        </div>
        {error && (
          <p className='mt-1 text-xs text-red-600 dark:text-red-400'>{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

const Checkbox = React.forwardRef(
  ({ className = '', label, error, ...props }, ref) => {
    const checkboxClasses = cn(
      'h-4 w-4 rounded-md border-gray-300 text-primary-600 focus:ring-primary-500',
      {
        'border-red-500': error,
      },
      className
    );

    return (
      <div className='flex items-center space-x-2'>
        <input
          type='checkbox'
          ref={ref}
          className={checkboxClasses}
          {...props}
        />
        {label && (
          <label
            htmlFor={props.id}
            className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            {label}
          </label>
        )}
        {error && (
          <p className='mt-1 text-xs text-red-600 dark:text-red-400'>{error}</p>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Input, Select, Textarea, Checkbox };
