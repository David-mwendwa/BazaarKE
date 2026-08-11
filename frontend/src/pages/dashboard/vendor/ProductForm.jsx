import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { PageHeader } from '../shared/PageHeader';
import { MarkdownField } from '../shared/MarkdownField.jsx';
import { ImageUploader } from '../shared/ImageUploader.jsx';
import apiClient from '../../../api/apiClient.js';
import { htmlToMarkdown, markdownToHtml } from '../../../lib/richText.js';
import { useCategories } from '../../../hooks/useCategories.js';

// Advisory only — see MarkdownField. The old `maxLength={160}` on this field
// was doing nothing useful: it never truncated the loaded value, and 853 of
// the 927 seeded products are already longer than that.
const SHORT_DESCRIPTION_TARGET = 160;

const EMPTY_FORM = {
  name: '',
  category: '',
  brand: '',
  price: '',
  specialPrice: '',
  stockQty: '',
  thumbnail: '',
  gallery: [],
  shortDescription: '',
  description: '',
  warranty: '',
  isActive: true,
};

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm ring-offset-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const VendorProductForm = () => {
  const { categories } = useCategories();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // A new product starts on the first category, but the list is fetched now,
  // so the default can't be baked into `EMPTY_FORM` the way it was — that
  // read `CATEGORIES[0]` at import time. Only seeded on a blank form: an
  // existing product's category must never be overwritten by the default.
  useEffect(() => {
    if (!form.category && categories.length) {
      setForm((prev) => (prev.category ? prev : { ...prev, category: categories[0].slug }));
    }
  }, [categories, form.category]);

  useEffect(() => {
    if (!isEdit) return;
    apiClient
      .get(`/product/${id}`)
      .then((res) => {
        const p = res.data.product;
        setForm({
          name: p.name || '',
          category: p.category || '',
          brand: p.brand || '',
          price: p.price ?? '',
          specialPrice: p.specialPrice ?? '',
          stockQty: p.stock?.qty ?? '',
          thumbnail: p.thumbnail || '',
          // The schema stores gallery entries as { full, thumbnail } pairs;
          // the uploader deals in plain URLs, so flatten on the way in.
          gallery: (p.gallery || []).map((img) => img.full || img.thumbnail).filter(Boolean),
          // Stored as HTML; edited as markdown. See lib/richText.js.
          shortDescription: htmlToMarkdown(p.shortDescription),
          description: htmlToMarkdown(p.description),
          warranty: p.warranty || '',
          isActive: p.isActive !== false,
        });
      })
      .catch(() => toast.error('Could not load this product.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  // MarkdownField owns its textarea, so it hands back a value, not an event.
  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // The uploader isn't a native input, so `required` on it can't block
    // submission the way it did on the old URL field.
    if (!form.thumbnail) {
      toast.error('Add a main image before saving.');
      return;
    }

    setSaving(true);
    try {
      const qty = Number(form.stockQty) || 0;
      const payload = {
        name: form.name,
        category: form.category,
        brand: form.brand || undefined,
        price: Number(form.price),
        specialPrice: form.specialPrice ? Number(form.specialPrice) : null,
        thumbnail: form.thumbnail,
        gallery: form.gallery.map((url) => ({ full: url, thumbnail: url })),
        shortDescription: markdownToHtml(form.shortDescription) || undefined,
        description: markdownToHtml(form.description) || undefined,
        warranty: form.warranty || undefined,
        stock: { qty, status: qty > 0 ? 'in_stock' : 'out_of_stock' },
        isActive: form.isActive,
      };

      if (isEdit) {
        await apiClient.patch(`/vendor/products/${id}`, payload);
        toast.success('Product updated.');
      } else {
        await apiClient.post('/vendor/products', payload);
        toast.success('Product added.');
      }
      navigate('/dashboard/vendor/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save this product.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className='text-muted-foreground text-sm'>Loading…</p>;

  return (
    <div className='space-y-6'>
      <PageHeader title={isEdit ? 'Edit Product' : 'Add Product'} description='Manage your product details and inventory' />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Product details</CardTitle>
            <CardDescription>Basic information shown to shoppers on this listing.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            <div className='space-y-1.5'>
              <Label htmlFor='name'>Product name</Label>
              <Input id='name' required value={form.name} onChange={handleChange('name')} placeholder='e.g. Samsung Galaxy Tab S10 FE' />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='category'>Category</Label>
                <select id='category' className={selectClass} value={form.category} onChange={handleChange('category')}>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='brand'>Brand</Label>
                <Input id='brand' value={form.brand} onChange={handleChange('brand')} />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='price'>Price (KES)</Label>
                <Input id='price' type='number' min='0' step='0.01' required value={form.price} onChange={handleChange('price')} />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='specialPrice'>Sale price (optional)</Label>
                <Input id='specialPrice' type='number' min='0' step='0.01' value={form.specialPrice} onChange={handleChange('specialPrice')} />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='stockQty'>Stock quantity</Label>
                <Input id='stockQty' type='number' min='0' required value={form.stockQty} onChange={handleChange('stockQty')} />
              </div>
            </div>

            <ImageUploader
              label='Main image'
              required
              value={form.thumbnail}
              onChange={setField('thumbnail')}
              hint='Shown in search results, the shop grid and the cart.'
            />

            <ImageUploader
              label='More images'
              multiple
              value={form.gallery}
              onChange={setField('gallery')}
              hint='Optional extra shots for the product page.'
            />

            <MarkdownField
              id='shortDescription'
              label='Short description'
              rows={4}
              recommendedLength={SHORT_DESCRIPTION_TARGET}
              value={form.shortDescription}
              onChange={setField('shortDescription')}
              hint='The summary shoppers see beside the Add to cart button. A few key features works well.'
            />

            <MarkdownField
              id='description'
              label='Description'
              rows={8}
              value={form.description}
              onChange={setField('description')}
              hint='The full write-up, shown lower down the product page. Select text and use the buttons to format it.'
            />

            <div className='space-y-1.5'>
              <Label htmlFor='warranty'>Warranty (optional)</Label>
              <Input id='warranty' value={form.warranty} onChange={handleChange('warranty')} placeholder='e.g. 1 year manufacturer warranty' />
            </div>

            {/* Drives the Status column in the products table, and the
                storefront's own `isActive: true` filter — an inactive listing
                genuinely disappears from the shop. */}
            <div className='flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700'>
              <div className='space-y-0.5'>
                <Label htmlFor='isActive' className='cursor-pointer'>
                  Visible in store
                </Label>
                <p className='text-xs text-muted-foreground'>
                  {form.isActive
                    ? 'Shoppers can find and buy this product.'
                    : 'Hidden from the storefront — saved as a draft.'}
                </p>
              </div>
              <button
                type='button'
                id='isActive'
                role='switch'
                aria-checked={form.isActive}
                onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  form.isActive ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    form.isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </CardContent>
          <CardFooter className='justify-end gap-3'>
            <Button type='button' variant='outline' onClick={() => navigate('/dashboard/vendor/products')}>
              Cancel
            </Button>
            <Button type='submit' disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default VendorProductForm;
