import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  FolderTree,
  Pencil,
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';

import apiClient from '../../../api/apiClient.js';
import DataTable from '../../../components/common/DataTable';
import SelectFilter from '../../../components/common/SelectFilter';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { cn } from '../../../lib/utils';
import { useConfirm, usePrompt } from '../../../context/ConfirmContext.js';
import { invalidateCategories } from '../../../hooks/useCategories.js';
import ContentSkeleton from '../shared/ContentSkeleton';
import ImageUploader from '../shared/ImageUploader';
import { PageHeader, PageHeaderFilters } from '../shared/PageHeader';
import { IconAction, RowActions } from '../shared/RowActions.jsx';

/**
 * The shop's taxonomy, editable.
 *
 * Two things about categories here that don't apply to the other admin tables:
 *
 *  - **The URL segment is a join key, not a display detail.** Products carry
 *    it as a plain string, so changing it moves every product in the category
 *    with it. The form says so, and the API reports how many moved.
 *  - **Deleting is guarded.** A category with products in it can't be removed
 *    without saying where they go, because the row is what makes them
 *    reachable — deleting it would leave them listed, searchable and under
 *    nothing.
 */

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const BLANK = {
  name: '',
  slug: '',
  description: '',
  thumbnail: '',
  thumbnailAlt: '',
  displayOrder: '',
  isActive: true,
  isFeatured: false,
};

const CategoryForm = ({ initial, onCancel, onSaved }) => {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  // Typing a name fills the URL segment, until the segment is edited by hand —
  // after that it's the admin's, and silently rewriting it while they finish
  // typing the name would be maddening.
  const [slugTouched, setSlugTouched] = useState(Boolean(initial._id));

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const slugPreview = form.slug || slugify(form.name) || 'category';
  const slugChanged = Boolean(initial._id) && slugPreview !== initial.slug;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: slugPreview,
        description: form.description.trim(),
        displayOrder: form.displayOrder === '' ? 0 : Number(form.displayOrder),
        isActive: Boolean(form.isActive),
        isFeatured: Boolean(form.isFeatured),
        // `null` clears it; the API leaves an absent key alone.
        thumbnail: form.thumbnail
          ? { url: form.thumbnail, alt: form.thumbnailAlt.trim() }
          : null,
      };

      const res = form._id
        ? await apiClient.patch(`/categories/${form._id}`, payload)
        : await apiClient.post('/categories', payload);

      toast.success(res.data.message || (form._id ? 'Category updated' : 'Category created'));
      onSaved(res.data.category);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className='p-5'>
        <form onSubmit={submit} className='space-y-4'>
          <h3 className='font-semibold text-foreground'>
            {form._id ? `Edit ${initial.name}` : 'New category'}
          </h3>

          <div className='grid gap-4 lg:grid-cols-2'>
            <div className='space-y-4'>
              <label className='block'>
                <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>Name</span>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name,
                      slug: slugTouched ? prev.slug : slugify(name),
                    }));
                  }}
                  placeholder='Smart home'
                  className='h-9'
                />
              </label>

              <label className='block'>
                <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  URL segment
                </span>
                <div className='flex items-center rounded-md border border-input bg-background pl-3'>
                  <span className='shrink-0 text-sm text-muted-foreground'>/products?category=</span>
                  <input
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((prev) => ({ ...prev, slug: e.target.value }));
                    }}
                    placeholder={slugify(form.name) || 'smart-home'}
                    className='h-9 w-full bg-transparent px-1 text-sm font-medium text-foreground focus:outline-none'
                  />
                </div>
                {/* Only shown when it's actually about to happen. This is the
                    one edit on this screen with a side effect outside the row
                    being edited. */}
                {slugChanged && (
                  <span className='mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400'>
                    <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                    Every product in this category moves to the new segment, and links to
                    /products?category={initial.slug} stop matching.
                  </span>
                )}
              </label>

              <label className='block'>
                <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Description — shown on the category's listing page
                </span>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  maxLength={300}
                  rows={3}
                  placeholder='Lighting, plugs, cameras and speakers that talk to each other.'
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                />
                <span className='mt-1 block text-right text-xs text-muted-foreground tabular-nums'>
                  {form.description.length}/300
                </span>
              </label>

              <label className='block max-w-[10rem]'>
                <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Nav position
                </span>
                <Input
                  type='number'
                  value={form.displayOrder}
                  onChange={set('displayOrder')}
                  placeholder='0'
                  className='h-9'
                />
              </label>
            </div>

            <div className='space-y-4'>
              <ImageUploader
                label='Thumbnail (optional)'
                value={form.thumbnail}
                onChange={(url) => setForm((prev) => ({ ...prev, thumbnail: url }))}
                endpoint='/uploads/category-image'
                fieldName='image'
                previewAspect='aspect-[8/5] max-w-[16rem]'
                hint='Cropped to a wide tile. Without one, the storefront uses the category icon — nothing looks unfinished.'
              />

              {form.thumbnail && (
                <label className='block'>
                  <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                    Image description, for screen readers
                  </span>
                  <Input
                    value={form.thumbnailAlt}
                    onChange={set('thumbnailAlt')}
                    placeholder='A desk with a laptop, monitor and keyboard'
                    className='h-9'
                  />
                </label>
              )}
            </div>
          </div>

          <div className='flex flex-wrap gap-x-6 gap-y-3'>
            <label className='flex items-start gap-2.5'>
              <input
                type='checkbox'
                checked={Boolean(form.isActive)}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className='mt-0.5 rounded border-input text-primary-600 focus:ring-primary-500'
              />
              <span className='text-sm'>
                <span className='font-medium text-foreground'>Visible to shoppers</span>
                <span className='block text-xs text-muted-foreground'>
                  Turning this off hides the category without touching the products in it.
                </span>
              </span>
            </label>

            <label className='flex items-start gap-2.5'>
              <input
                type='checkbox'
                checked={Boolean(form.isFeatured)}
                onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
                className='mt-0.5 rounded border-input text-primary-600 focus:ring-primary-500'
              />
              <span className='text-sm'>
                <span className='font-medium text-foreground'>Feature it</span>
                <span className='block text-xs text-muted-foreground'>
                  Marks it as a lead department in the catalogue.
                </span>
              </span>
            </label>
          </div>

          <div className='flex justify-end gap-2'>
            <Button type='button' variant='ghost' onClick={onCancel}>
              Cancel
            </Button>
            <Button type='submit' disabled={saving}>
              {saving ? 'Saving…' : form._id ? 'Save changes' : 'Create category'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const AdminCategories = () => {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [categories, setCategories] = useState([]);
  const [orphans, setOrphans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [editing, setEditing] = useState(null);

  const load = () =>
    apiClient
      .get('/categories', { params: { includeInactive: true } })
      .then((res) => {
        setCategories(res.data.categories || []);
        setOrphans(res.data.orphans || []);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load categories'));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  // Every edit here changes what the storefront's nav, filters and home page
  // show. Those read a shared cache, so it has to be dropped — otherwise the
  // admin saves a category and the header in the same tab keeps the old list
  // until a reload.
  const afterWrite = async () => {
    await load();
    invalidateCategories();
  };

  const patch = async (row, body, failure) => {
    try {
      await apiClient.patch(`/categories/${row._id}`, body);
      await afterWrite();
    } catch (err) {
      toast.error(err.response?.data?.message || failure);
    }
  };

  const remove = async (row) => {
    let moveTo;

    if (row.productCount > 0) {
      // The old prompt asked an admin to *type* a slug from a list in the
      // message, and a typo meant a rejected delete with no products moved.
      // The categories are known, so they're a menu.
      moveTo = await prompt({
        title: `Delete ${row.name}?`,
        message: `${row.productCount} product${row.productCount === 1 ? '' : 's'} sit under it. They have to go somewhere — pick a category, or cancel and hide this one instead.`,
        label: 'Move the products to',
        options: categories
          .filter((c) => c._id !== row._id)
          .map((c) => ({ value: c.slug, label: `${c.name} (/${c.slug})` })),
        required: true,
        confirmLabel: 'Move and delete',
        tone: 'danger',
      });
      if (!moveTo) return;
    } else if (
      !(await confirm({
        title: `Delete ${row.name}?`,
        message: 'It has no products in it, so nothing else changes.',
        confirmLabel: 'Delete',
      }))
    ) {
      return;
    }

    try {
      const res = await apiClient.delete(`/categories/${row._id}`, {
        params: moveTo ? { moveTo: moveTo.trim().toLowerCase() } : {},
      });
      toast.success(res.data.message);
      await afterWrite();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the category');
    }
  };

  const onSaved = async () => {
    setEditing(null);
    await afterWrite();
  };

  const filtered = useMemo(() => {
    let result = [...categories];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.slug.includes(q) ||
          c.description?.toLowerCase().includes(q),
      );
    }
    if (visibility === 'visible') result = result.filter((c) => c.isActive);
    else if (visibility === 'hidden') result = result.filter((c) => !c.isActive);
    else if (visibility === 'empty') result = result.filter((c) => c.productCount === 0);
    return result;
  }, [categories, search, visibility]);

  if (loading) return <ContentSkeleton showTable rows={6} columns={5} showHeaderSection />;

  const nameCell = (row) => (
    <div className='flex min-w-0 items-center gap-3'>
      <span className='flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-50 text-xs font-bold uppercase text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'>
        {row.thumbnail?.url ? (
          <img
            src={row.thumbnail.url}
            alt=''
            loading='lazy'
            className='h-full w-full object-cover'
          />
        ) : (
          // A monogram, not a placeholder image — an empty grey box would read
          // as an image that failed to load.
          row.name.slice(0, 2)
        )}
      </span>
      <div className='flex min-w-0 flex-col'>
        <span className='flex items-center gap-1.5 font-medium text-foreground'>
          {row.name}
          {row.isFeatured && (
            <Star className='h-3.5 w-3.5 fill-secondary-400 text-secondary-500' aria-label='Featured' />
          )}
        </span>
        <span className='font-mono text-xs text-muted-foreground'>/{row.slug}</span>
      </div>
    </div>
  );

  const countCell = (row) => (
    <span className='text-sm tabular-nums text-foreground'>
      {row.productCount}
      {row.productCount === 0 && (
        <span className='ml-2 text-xs text-muted-foreground'>nothing to show</span>
      )}
    </span>
  );

  const statusCell = (row) => (
    <Badge
      variant='outline'
      className={cn(
        'border-transparent',
        row.isActive
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      )}>
      {row.isActive ? 'Visible' : 'Hidden'}
    </Badge>
  );

  const rowActions = (row) => (
    <RowActions>
      <IconAction
        icon={Pencil}
        label={`Edit ${row.name}`}
        tone='primary'
        onClick={() =>
          setEditing({
            ...BLANK,
            ...row,
            description: row.description || '',
            displayOrder: String(row.displayOrder ?? ''),
            thumbnail: row.thumbnail?.url || '',
            thumbnailAlt: row.thumbnail?.alt || '',
          })
        }
      />
      {/* Both toggles name the outcome, not the state — "Hide from shoppers"
          says what the click does, where "Visible" would only repeat the
          Status badge two columns to the left. */}
      <IconAction
        icon={row.isActive ? EyeOff : Eye}
        label={row.isActive ? 'Hide from shoppers' : 'Show to shoppers'}
        onClick={() => patch(row, { isActive: !row.isActive }, 'Could not update the category')}
      />
      <IconAction
        icon={row.isFeatured ? StarOff : Star}
        label={row.isFeatured ? 'Remove from featured' : 'Mark as featured'}
        onClick={() => patch(row, { isFeatured: !row.isFeatured }, 'Could not update the category')}
      />
      <IconAction icon={Trash2} label={`Delete ${row.name}`} tone='danger' onClick={() => remove(row)} />
    </RowActions>
  );

  const columns = [
    { key: 'name', header: 'Category', className: 'text-left', cell: nameCell },
    {
      key: 'productCount',
      header: 'Products',
      className: 'text-left',
      cell: countCell,
      sortValue: (row) => row.productCount,
    },
    { key: 'isActive', header: 'Status', className: 'text-left', cell: statusCell },
    {
      key: 'displayOrder',
      header: 'Nav position',
      className: 'text-left',
      hideBelow: 'lg',
      cell: (row) => (
        <span className='text-sm tabular-nums text-muted-foreground'>{row.displayOrder ?? 0}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      className: 'text-left',
      hideBelow: 'xl',
      sortable: false,
      cell: (row) => (
        <span className='line-clamp-1 text-sm text-muted-foreground'>
          {row.description || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      className: 'sticky text-right',
      cell: rowActions,
    },
  ];

  const mobileCard = (row) => (
    <div className='flex flex-col gap-2'>
      <div className='flex items-start justify-between gap-2'>
        {nameCell(row)}
        {rowActions(row)}
      </div>
      <div className='flex items-center justify-between gap-2'>
        {countCell(row)}
        {statusCell(row)}
      </div>
      {row.description && (
        <p className='line-clamp-2 text-xs text-muted-foreground'>{row.description}</p>
      )}
      <span className='text-xs text-muted-foreground'>Nav position {row.displayOrder ?? 0}</span>
    </div>
  );

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Categories'
        description={`${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} · ${categories.reduce((n, c) => n + c.productCount, 0)} products filed`}>
        <PageHeaderFilters>
          <div className='relative w-full sm:max-w-xs'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search categories…'
              className='h-9 w-full pl-10'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <SelectFilter
            options={{
              all: 'All categories',
              visible: 'Visible',
              hidden: 'Hidden',
              empty: 'Empty',
            }}
            value={visibility}
            onChange={setVisibility}
            placeholder='Visibility'
            className='h-9 w-full text-sm sm:w-44'
          />
          <Button className='h-9' onClick={() => setEditing({ ...BLANK })}>
            <Plus className='mr-2 h-4 w-4' />
            New category
          </Button>
        </PageHeaderFilters>
      </PageHeader>

      {/* Slugs that products carry but no category row describes. The old
          hardcoded list could drift from the catalogue with nothing to say so;
          this is where that shows up. */}
      {orphans.length > 0 && (
        <Card className='border-amber-300 dark:border-amber-800'>
          <CardContent className='flex items-start gap-3 p-4'>
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400' />
            <div className='text-sm'>
              <p className='font-medium text-foreground'>
                Products are filed under {orphans.length} segment
                {orphans.length === 1 ? '' : 's'} with no category
              </p>
              <p className='mt-0.5 text-muted-foreground'>
                They're listed and searchable, but nothing in the nav points at them. Create a
                category with the matching URL segment, or re-file the products.
              </p>
              <ul className='mt-2 flex flex-wrap gap-2'>
                {orphans.map((orphan) => (
                  <li
                    key={orphan.slug}
                    className='rounded-md bg-amber-50 px-2 py-1 font-mono text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-300'>
                    /{orphan.slug} · {orphan.productCount}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keyed by what's being edited. The form seeds its fields from `initial`
          once, at mount — without this the component is reused across a switch
          from New to Edit (or from one category to another) and keeps the
          fields it opened with. */}
      {editing && (
        <CategoryForm
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
                <FolderTree className='h-10 w-10 text-muted-foreground' />
                <h3 className='font-medium text-foreground'>No categories yet</h3>
                <p className='max-w-xs text-center text-sm text-muted-foreground'>
                  Create one, or run <code className='font-mono'>npm run seed:categories</code> to
                  build the list from the products already in the catalogue.
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCategories;
