import React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef(
  ({ className, variant = 'default', hoverable = false, ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
      primary:
        'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800/50',
      success:
        'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50',
      warning:
        'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50',
      danger:
        'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border shadow-sm transition-all',
          'text-card-foreground overflow-hidden',
          variants[variant] || variants.default,
          hoverable && 'hover:shadow-md hover:-translate-y-0.5',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef(
  ({ className, withBorder = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-1.5 p-6',
        withBorder && 'border-b border-gray-200 dark:border-gray-700',
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(
  ({ className, as: Component = 'h3', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        'text-xl font-semibold leading-none tracking-tight',
        'text-gray-900 dark:text-white',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-500 dark:text-gray-400', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(
  ({ className, noPadding = false, ...props }, ref) => (
    <div ref={ref} className={cn(!noPadding && 'p-6', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center p-6 pt-0',
      'border-t border-gray-200 dark:border-gray-700',
      className
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
