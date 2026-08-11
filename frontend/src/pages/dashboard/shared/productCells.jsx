import { CheckCircle, XCircle, ImageOff } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { cn, formatCurrency } from '../../../lib/utils';

// Shared cell renderers for the vendor + admin product tables, so both stay
// visually identical and there's one place to change product presentation.

const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"/>';

export const Thumb = ({ src, alt }) => (
  <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'>
    {src ? (
      <img
        src={src}
        alt={alt}
        loading='lazy'
        className='h-full w-full object-contain'
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = PLACEHOLDER;
        }}
      />
    ) : (
      <ImageOff className='h-4 w-4 text-muted-foreground' />
    )}
  </div>
);

/**
 * Identity cell: thumbnail beside the name, with category and SKU demoted to
 * a secondary line. Folding those two in removes a whole Category column
 * while keeping the information scannable.
 */
export const ProductIdentity = ({ product, to, LinkComponent }) => {
  const meta = [product.category, product.sku].filter(Boolean).join(' · ');
  const name = <span className='line-clamp-1 font-medium text-foreground'>{product.name}</span>;

  return (
    <div className='flex min-w-0 items-center gap-3'>
      <Thumb src={product.thumbnail} alt={product.name} />
      <div className='min-w-0'>
        {to && LinkComponent ? (
          <LinkComponent to={to} onClick={(e) => e.stopPropagation()} className='hover:underline'>
            {name}
          </LinkComponent>
        ) : (
          name
        )}
        <p className='line-clamp-1 text-xs capitalize text-muted-foreground'>{meta || '—'}</p>
      </div>
    </div>
  );
};

export const PriceCell = ({ product, align = 'end' }) => (
  <div className={cn('flex flex-col', align === 'end' ? 'items-end' : 'items-start')}>
    <span className='font-medium tabular-nums text-foreground'>
      {formatCurrency(Number(product.specialPrice || product.price))}
    </span>
    {product.specialPrice && (
      <span className='text-xs tabular-nums text-muted-foreground line-through'>
        {formatCurrency(Number(product.price))}
      </span>
    )}
  </div>
);

const LOW_STOCK_THRESHOLD = 10;

export const StockCell = ({ product }) => {
  const qty = product.stock?.qty ?? 0;
  const tone = qty <= 0 ? 'bg-red-500' : qty <= LOW_STOCK_THRESHOLD ? 'bg-amber-500' : 'bg-green-500';
  const note = qty <= 0 ? 'Out of stock' : qty <= LOW_STOCK_THRESHOLD ? 'Low' : 'In stock';

  return (
    <div className='flex items-center gap-2'>
      <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', tone)} />
      <span className='font-medium tabular-nums'>{qty}</span>
      <span className='text-xs text-muted-foreground'>{note}</span>
    </div>
  );
};

/**
 * Last-updated stamp. Both product tables default to `-updatedAt`, so without
 * a column for it the table arrives sorted by something invisible that can't
 * be reversed or re-applied once you've sorted by anything else.
 *
 * Recent edits are what a vendor is actually looking for after a bulk change,
 * so the last week reads as "3 days ago" and anything older as a plain date.
 */
export const UpdatedCell = ({ value, prefix }) => {
  if (!value) return <span className='text-muted-foreground/50'>—</span>;

  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const label =
    days <= 0
      ? 'Today'
      : days === 1
        ? 'Yesterday'
        : days < 7
          ? `${days} days ago`
          : date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString('en-KE')} className='text-sm tabular-nums text-muted-foreground'>
      {/* The column header supplies the context on desktop; the mobile card
          has no header, so it passes one in. */}
      {prefix ? `${prefix} ` : ''}
      {label}
    </time>
  );
};

export const StatusBadge = ({ product }) => {
  const active = product.isActive !== false;
  const Icon = active ? CheckCircle : XCircle;
  return (
    <Badge
      variant='outline'
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap border-transparent',
        active
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      )}>
      <Icon className='h-3.5 w-3.5' />
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
};

