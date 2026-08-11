import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Eye, EyeOff, Pencil, Plus, Power, PowerOff, Search, Tag, Trash2 } from 'lucide-react';

import apiClient from '../../../api/apiClient.js';
import DataTable from '../../../components/common/DataTable';
import SelectFilter from '../../../components/common/SelectFilter';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { cn } from '../../../lib/utils';
import ContentSkeleton from '../shared/ContentSkeleton';
import { useConfirm } from '../../../context/ConfirmContext.js';
import { PageHeader, PageHeaderFilters } from '../shared/PageHeader';
import { IconAction, RowActions } from '../shared/RowActions.jsx';

const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

const BLANK = {
  code: '',
  description: '',
  type: 'percent',
  value: '',
  maxDiscount: '',
  minSpend: '',
  usageLimit: '',
  expiresAt: '',
  isPublic: false,
};

/**
 * Create/edit form. Inline rather than in a dialog: a coupon has eight fields
 * with real interdependencies (a percent cap only means something on a
 * percent coupon), and a modal that tall on a laptop scrolls inside itself.
 */
const CouponForm = ({ initial, onCancel, onSaved }) => {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Empty strings would fail the schema's `min` validators; the API reads
      // an absent field as "leave at the default".
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        type: form.type,
        value: Number(form.value),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : 0,
        minSpend: form.minSpend ? Number(form.minSpend) : 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : 0,
        expiresAt: form.expiresAt || null,
        isPublic: Boolean(form.isPublic),
      };

      const res = form._id
        ? await apiClient.patch(`/coupons/${form._id}`, payload)
        : await apiClient.post('/coupons', payload);

      toast.success(form._id ? 'Coupon updated' : 'Coupon created');
      onSaved(res.data.coupon);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the coupon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className='p-5'>
        <form onSubmit={submit} className='space-y-4'>
          <h3 className='font-semibold text-foreground'>
            {form._id ? `Edit ${form.code}` : 'New coupon'}
          </h3>

          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <label className='block'>
              <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>Code</span>
              <Input
                required
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder='WELCOME10'
                className='h-9 uppercase'
              />
            </label>

            <label className='block'>
              <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>Type</span>
              <select
                value={form.type}
                onChange={set('type')}
                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'>
                <option value='percent'>Percentage off</option>
                <option value='fixed'>Fixed amount off</option>
              </select>
            </label>

            <label className='block'>
              <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                {form.type === 'percent' ? 'Percent (1–100)' : 'Amount (Ksh)'}
              </span>
              <Input
                required
                type='number'
                min='1'
                max={form.type === 'percent' ? '100' : undefined}
                value={form.value}
                onChange={set('value')}
                className='h-9'
              />
            </label>

            <label className='block'>
              <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                Expires (optional)
              </span>
              <Input type='date' value={form.expiresAt} onChange={set('expiresAt')} className='h-9' />
            </label>

            {form.type === 'percent' && (
              <label className='block'>
                <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Max discount (Ksh)
                </span>
                <Input
                  type='number'
                  min='0'
                  value={form.maxDiscount}
                  onChange={set('maxDiscount')}
                  placeholder='No cap'
                  className='h-9'
                />
              </label>
            )}

            <label className='block'>
              <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                Minimum spend (Ksh)
              </span>
              <Input
                type='number'
                min='0'
                value={form.minSpend}
                onChange={set('minSpend')}
                placeholder='None'
                className='h-9'
              />
            </label>

            <label className='block'>
              <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                Usage limit
              </span>
              <Input
                type='number'
                min='0'
                value={form.usageLimit}
                onChange={set('usageLimit')}
                placeholder='Unlimited'
                className='h-9'
              />
            </label>

            <label className='block sm:col-span-2 lg:col-span-4'>
              <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                Description — shown to shoppers when the code is listed
              </span>
              <Input
                value={form.description}
                onChange={set('description')}
                placeholder='10% off your order, up to Ksh 5,000'
                className='h-9'
              />
            </label>
          </div>

          {/* Off by default. A code made for one customer must not appear on
              every shopper's cart because nobody remembered to hide it. */}
          <label className='flex items-start gap-2.5'>
            <input
              type='checkbox'
              checked={Boolean(form.isPublic)}
              onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))}
              className='mt-0.5 rounded border-input text-primary-600 focus:ring-primary-500'
            />
            <span className='text-sm'>
              <span className='font-medium text-foreground'>Show publicly</span>
              <span className='block text-xs text-muted-foreground'>
                Lists this code under the promo box in the cart and at checkout. Leave off for a
                code you're sending to one customer.
              </span>
            </span>
          </label>

          <div className='flex justify-end gap-2'>
            <Button type='button' variant='ghost' onClick={onCancel}>
              Cancel
            </Button>
            <Button type='submit' disabled={saving}>
              {saving ? 'Saving…' : form._id ? 'Save changes' : 'Create coupon'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const AdminCoupons = () => {
  const confirm = useConfirm();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    apiClient
      .get('/coupons')
      .then((res) => setCoupons(res.data.coupons || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load coupons'))
      .finally(() => setLoading(false));
  }, []);

  const isExpired = (row) => row.expiresAt && new Date(row.expiresAt).getTime() < Date.now();
  const isSpent = (row) => row.usageLimit > 0 && row.usedCount >= row.usageLimit;

  const toggleActive = async (row) => {
    try {
      const res = await apiClient.patch(`/coupons/${row._id}`, { isActive: !row.isActive });
      setCoupons((prev) => prev.map((c) => (c._id === row._id ? res.data.coupon : c)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the coupon');
    }
  };

  const togglePublic = async (row) => {
    try {
      const res = await apiClient.patch(`/coupons/${row._id}`, { isPublic: !row.isPublic });
      setCoupons((prev) => prev.map((c) => (c._id === row._id ? res.data.coupon : c)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the coupon');
    }
  };

  const remove = async (row) => {
    const confirmed = await confirm({
      title: `Delete ${row.code}?`,
      message: 'Orders that already used it keep their discount. Anyone typing it from here on gets a rejection.',
      confirmLabel: 'Delete code',
    });
    if (!confirmed)
      return;
    try {
      await apiClient.delete(`/coupons/${row._id}`);
      setCoupons((prev) => prev.filter((c) => c._id !== row._id));
      toast.success('Coupon deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the coupon');
    }
  };

  const onSaved = (coupon) => {
    setCoupons((prev) => {
      const exists = prev.some((c) => c._id === coupon._id);
      return exists ? prev.map((c) => (c._id === coupon._id ? coupon : c)) : [coupon, ...prev];
    });
    setEditing(null);
  };

  const filtered = useMemo(() => {
    let result = [...coupons];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.code.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      );
    }
    if (status === 'active') {
      result = result.filter((c) => c.isActive && !isExpired(c) && !isSpent(c));
    } else if (status === 'inactive') {
      result = result.filter((c) => !c.isActive || isExpired(c) || isSpent(c));
    }
    return result;
  }, [coupons, search, status]);

  if (loading) return <ContentSkeleton showTable rows={8} columns={6} showHeaderSection />;

  const codeCell = (row) => (
    <div className='flex min-w-0 flex-col'>
      <span className='font-mono font-semibold uppercase text-foreground'>{row.code}</span>
      {row.description && (
        <span className='line-clamp-1 text-xs text-muted-foreground'>{row.description}</span>
      )}
    </div>
  );

  const valueCell = (row) => (
    <span className='text-sm text-foreground'>
      {row.type === 'percent' ? `${row.value}% off` : `${formatKsh(row.value)} off`}
      {row.type === 'percent' && row.maxDiscount > 0 && (
        <span className='block text-xs text-muted-foreground'>max {formatKsh(row.maxDiscount)}</span>
      )}
      {row.minSpend > 0 && (
        <span className='block text-xs text-muted-foreground'>
          over {formatKsh(row.minSpend)}
        </span>
      )}
    </span>
  );

  // Three separate reasons a code stops working, and the admin needs to know
  // which one applies — "Inactive" on an expired coupon sends you looking for
  // a toggle that isn't the problem.
  const statusCell = (row) => {
    const [label, tone] = !row.isActive
      ? ['Disabled', 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300']
      : isExpired(row)
        ? ['Expired', 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400']
        : isSpent(row)
          ? ['Fully used', 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400']
          : ['Active', 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'];

    return (
      <Badge variant='outline' className={cn('border-transparent', tone)}>
        {label}
      </Badge>
    );
  };

  const usageCell = (row) => (
    <span className='text-sm tabular-nums text-muted-foreground'>
      {row.usedCount}
      {row.usageLimit > 0 ? ` / ${row.usageLimit}` : ''}
    </span>
  );

  const rowActions = (row) => (
    <RowActions>
      <IconAction
        icon={Pencil}
        label={`Edit ${row.code}`}
        tone='primary'
        onClick={() =>
          setEditing({
            ...BLANK,
            ...row,
            value: String(row.value ?? ''),
            maxDiscount: row.maxDiscount ? String(row.maxDiscount) : '',
            minSpend: row.minSpend ? String(row.minSpend) : '',
            usageLimit: row.usageLimit ? String(row.usageLimit) : '',
            expiresAt: row.expiresAt ? row.expiresAt.slice(0, 10) : '',
          })
        }
      />
      {/* Two different switches that both sound like "off": disabling stops
          the code working at all, hiding only takes it off the promo list.
          The icons keep them apart — a power switch against an eye. */}
      <IconAction
        icon={row.isActive ? PowerOff : Power}
        label={row.isActive ? 'Disable this code' : 'Enable this code'}
        onClick={() => toggleActive(row)}
      />
      <IconAction
        icon={row.isPublic ? EyeOff : Eye}
        label={row.isPublic ? 'Hide from the promo list' : 'List it publicly'}
        onClick={() => togglePublic(row)}
      />
      <IconAction icon={Trash2} label={`Delete ${row.code}`} tone='danger' onClick={() => remove(row)} />
    </RowActions>
  );

  const columns = [
    { key: 'code', header: 'Code', className: 'text-left', cell: codeCell },
    { key: 'value', header: 'Discount', className: 'text-left', cell: valueCell, sortable: false },
    { key: 'isActive', header: 'Status', className: 'text-left', cell: statusCell },
    {
      key: 'isPublic',
      header: 'Visibility',
      className: 'text-left',
      hideBelow: 'lg',
      cell: (row) => (
        <span className='text-sm text-muted-foreground'>
          {row.isPublic ? 'Listed' : 'Code only'}
        </span>
      ),
    },
    {
      key: 'usedCount',
      header: 'Used',
      className: 'text-left',
      cell: usageCell,
      hideBelow: 'lg',
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      className: 'text-left',
      hideBelow: 'xl',
      cell: (row) => (
        <span className='text-sm text-muted-foreground'>{formatDate(row.expiresAt)}</span>
      ),
    },
    { key: 'actions', header: 'Actions', sortable: false, className: 'sticky text-right', cell: rowActions },
  ];

  // Everything hidden by `hideBelow` has to reappear here, or it's unreachable
  // on a phone.
  const mobileCard = (row) => (
    <div className='flex flex-col gap-2'>
      <div className='flex items-start justify-between gap-2'>
        {codeCell(row)}
        {rowActions(row)}
      </div>
      <div className='flex items-center justify-between gap-2'>
        {valueCell(row)}
        {statusCell(row)}
      </div>
      <div className='flex items-center justify-between gap-2 text-xs text-muted-foreground'>
        <span>
          Used {row.usedCount}{row.usageLimit > 0 ? ` of ${row.usageLimit}` : ''} ·{' '}
          {row.isPublic ? 'Listed' : 'Code only'}
        </span>
        <span>{row.expiresAt ? `Expires ${formatDate(row.expiresAt)}` : 'No expiry'}</span>
      </div>
    </div>
  );

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Promo codes'
        description={`${coupons.length} code${coupons.length === 1 ? '' : 's'} created`}>
        <PageHeaderFilters>
          <div className='relative w-full sm:max-w-xs'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search codes…'
              className='h-9 w-full pl-10'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <SelectFilter
            options={{ all: 'All codes', active: 'Active', inactive: 'Not usable' }}
            value={status}
            onChange={setStatus}
            placeholder='Status'
            className='h-9 w-full text-sm sm:w-44'
          />
          <Button className='h-9' onClick={() => setEditing({ ...BLANK })}>
            <Plus className='mr-2 h-4 w-4' />
            New code
          </Button>
        </PageHeaderFilters>
      </PageHeader>

      {/* Keyed so switching what's being edited remounts the form — it seeds
          its fields from `initial` at mount only. */}
      {editing && (
        <CouponForm
          key={editing._id || 'new'}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      <Card>
        <CardContent className='p-0'>
          <DataTable
            columns={columns}
            data={filtered}
            mobileCard={mobileCard}
            defaultRowsPerPage={20}
            rowsPerPageOptions={[20, 50, 100]}
            emptyState={
              <div className='flex flex-col items-center justify-center gap-3 py-12'>
                <Tag className='h-10 w-10 text-muted-foreground' />
                <h3 className='font-medium text-foreground'>No promo codes yet</h3>
                <p className='max-w-xs text-center text-sm text-muted-foreground'>
                  Create one and it works at checkout straight away.
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCoupons;
