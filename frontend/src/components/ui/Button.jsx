import React from 'react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      fullWidth = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      startIcon,
      endIcon,
      as: Component = 'button',
      asChild = false,
      iconOnly = false,
      ...props
    },
    ref
  ) => {
    // Variant styles with dark mode support
    const variants = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary-700 dark:hover:bg-primary-600',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-secondary-700 dark:hover:bg-secondary-600',
      outline:
        'border border-input hover:bg-accent hover:text-accent-foreground dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
      ghost:
        'hover:bg-accent hover:text-accent-foreground border border-transparent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center justify-center',
      link: 'text-primary underline-offset-4 hover:underline dark:text-primary-400',
      danger:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-red-800 dark:hover:bg-red-700',
      success:
        'bg-green-600 text-white hover:bg-green-700 dark:bg-green-800 dark:hover:bg-green-700',
      warning:
        'bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-700 dark:hover:bg-yellow-600',
      info: 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600',
    };

    // Size styles
    const sizes = {
      xs: 'h-7 px-2 text-xs',
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 py-2 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
      xl: 'h-14 px-8 text-lg',
      icon: 'h-10 w-10 p-0',
    };

    // Base styles with dark mode support
    const baseStyles = [
      'inline-flex items-center justify-center',
      'rounded-md font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none',
      'dark:focus-visible:ring-offset-gray-900',
    ];

    // Use startIcon if provided, otherwise fall back to leftIcon
    const StartIcon = startIcon || LeftIcon;
    const EndIcon = endIcon || RightIcon;

    // Ensure icons are rendered as React elements
    const renderIcon = (Icon, className) => {
      if (!Icon) return null;
      return React.isValidElement(Icon) ? (
        React.cloneElement(Icon, { className })
      ) : (
        <Icon className={className} />
      );
    };

    // If asChild is true, clone the child and add our classes to it
    if (asChild) {
      return React.cloneElement(React.Children.only(children), {
        className: cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          iconOnly && 'p-0',
          className
        ),
        ref,
        disabled:
          (Component === 'button' && (isLoading || disabled)) || undefined,
        'aria-disabled': isLoading || disabled || undefined,
        ...props,
      });
    }

    const buttonContent = (
      <>
        {isLoading && (
          <svg
            className='animate-spin -ml-1 mr-2 h-4 w-4 text-current'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'>
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
        )}
        {!isLoading &&
          StartIcon &&
          renderIcon(StartIcon, cn('h-4 w-4', children ? 'mr-2' : ''))}
        {children}
        {!isLoading &&
          EndIcon &&
          renderIcon(EndIcon, cn('h-4 w-4', children ? 'ml-2' : ''))}
      </>
    );

    const buttonProps = {
      className: cn(
        baseStyles,
        variants[variant],
        sizes[iconOnly ? 'icon' : size],
        fullWidth && 'w-full',
        className
      ),
      disabled:
        (Component === 'button' && (isLoading || disabled)) || undefined,
      'aria-disabled': isLoading || disabled || undefined,
      ref,
      ...props,
    };

    return <Component {...buttonProps}>{buttonContent}</Component>;
  }
);

Button.displayName = 'Button';

export { Button };

export const IconButton = React.forwardRef(
  ({ icon: Icon, className = '', ...props }, ref) => (
    <Button
      ref={ref}
      variant='ghost'
      size='icon'
      iconOnly
      className={className}
      {...props}>
      <Icon className='h-5 w-5 flex-shrink-0' />
    </Button>
  )
);

IconButton.displayName = 'IconButton';
