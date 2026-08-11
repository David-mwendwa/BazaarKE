import { useId, useRef, useState } from 'react';
import { UploadCloud, X, Loader2, Star } from 'lucide-react';
import { Label } from '../../../components/ui/Label';
import { Button } from '../../../components/ui/Button';
import apiClient from '../../../api/apiClient.js';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

const MODES = [
  { id: 'upload', label: 'Upload' },
  { id: 'link', label: 'Link' },
];

/**
 * Drag-and-drop image field. `value` is a URL string in single mode and an
 * array of URLs in multiple mode; either way the parent only ever deals in
 * URLs, since that's what the Product schema stores.
 *
 * Pasting a URL stays available alongside uploading — the seeded catalog is
 * entirely remote image links, so editing one of those products shouldn't
 * force a re-upload of an image that's already hosted.
 */
export const ImageUploader = ({
  label,
  value,
  onChange,
  multiple = false,
  hint,
  required,
  // Which upload endpoint receives the file, and under what field name.
  // Products go through the 1600px square-padded pipeline; a category
  // thumbnail is a landscape cover crop, which is a different endpoint rather
  // than a flag, because the two produce differently shaped assets.
  endpoint = '/uploads/images',
  fieldName = 'images',
  // Aspect ratio of the single-image preview, so a category banner previews as
  // the wide tile it will render as instead of in the product field's 3:2 box.
  previewAspect = 'aspect-[3/2] max-w-[14rem]',
}) => {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  // Upload and link are two routes to the same result, so they're modes rather
  // than a disclosure — showing both at once doubles the field's height and
  // leaves the vendor to work out which one they're meant to use.
  const [mode, setMode] = useState('upload');

  const images = multiple ? value || [] : value ? [value] : [];

  const apply = (next) => onChange(multiple ? next : next[0] || '');

  const upload = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) {
      setError('That file is not an image.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const body = new FormData();
      // Single mode still posts an array field — the endpoint accepts both and
      // returns a list either way.
      (multiple ? files : files.slice(0, 1)).forEach((file) => body.append(fieldName, file));

      // apiClient strips its JSON content type for FormData so the browser can
      // set the multipart boundary — see the request interceptor.
      const { data } = await apiClient.post(endpoint, body);

      // The multi-file endpoint answers with `images`, the single-file one
      // with `image`. Normalised here so the field doesn't care which it
      // was pointed at.
      const urls = (data.images || [data.image]).filter(Boolean).map((img) => img.url);
      apply(multiple ? [...images, ...urls] : urls);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Let the same file be picked again after a remove.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    // Dropping is unambiguous — honour it whichever mode is showing.
    setMode('upload');
    upload(e.dataTransfer.files);
  };

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError('Image links must start with http:// or https://');
      return;
    }
    setError('');
    apply(multiple ? [...images, url] : [url]);
    setUrlDraft('');
  };

  const removeAt = (index) => apply(images.filter((_, i) => i !== index));

  // The first gallery image is the one shown after the thumbnail, so being
  // able to promote one without re-uploading everything matters.
  const makeFirst = (index) =>
    apply([images[index], ...images.filter((_, i) => i !== index)]);

  return (
    <div className='space-y-1.5'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Label htmlFor={inputId}>
          {label}
          {required ? <span className='ml-0.5 text-red-500'>*</span> : null}
        </Label>
        <div className='flex rounded-md border border-input p-0.5'>
          {MODES.map((m) => (
            <button
              key={m.id}
              type='button'
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === m.id
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        // Dashed reads as "drop things here", so it belongs to Upload mode
        // only — a link field inside a dashed box invites the wrong gesture.
        className={`rounded-md border p-3 transition-colors ${
          mode === 'upload' ? 'border-dashed' : 'border-solid'
        } ${
          dragging
            ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-900/20'
            : 'border-input bg-white dark:bg-gray-800'
        }`}>
        {images.length > 0 && (
          <ul className={`mb-3 grid gap-2 ${multiple ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-1'}`}>
            {images.map((src, index) => (
              <li
                key={`${src}-${index}`}
                className={`group relative overflow-hidden rounded-md border border-input bg-gray-50 dark:bg-gray-900 ${
                  multiple ? 'aspect-square' : previewAspect
                }`}>
                <img src={src} alt='' loading='lazy' className='h-full w-full object-contain p-1' />

                <div className='absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100'>
                  {multiple && index > 0 && (
                    <button
                      type='button'
                      onClick={() => makeFirst(index)}
                      title='Make this the first image'
                      aria-label='Make this the first image'
                      className='rounded-md bg-white/90 p-1 text-gray-700 hover:bg-white'>
                      <Star className='h-3.5 w-3.5' aria-hidden='true' />
                    </button>
                  )}
                  <button
                    type='button'
                    onClick={() => removeAt(index)}
                    title='Remove image'
                    aria-label='Remove image'
                    className='rounded-md bg-white/90 p-1 text-red-600 hover:bg-white'>
                    <X className='h-3.5 w-3.5' aria-hidden='true' />
                  </button>
                </div>

                {multiple && index === 0 && (
                  <span className='absolute left-1 top-1 rounded-md bg-primary-600 px-1.5 py-0.5 text-[10px] font-semibold text-white'>
                    First
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {mode === 'upload' ? (
          <div className='flex flex-col items-center justify-center gap-2 py-4 text-center'>
            {uploading ? (
              <>
                <Loader2 className='h-6 w-6 animate-spin text-primary-600' aria-hidden='true' />
                <p className='text-sm text-muted-foreground'>Uploading…</p>
              </>
            ) : (
              <>
                <UploadCloud className='h-6 w-6 text-gray-400' aria-hidden='true' />
                <p className='text-sm text-gray-600 dark:text-gray-300'>
                  Drag {multiple ? 'images' : 'an image'} here, or{' '}
                  <button
                    type='button'
                    onClick={() => inputRef.current?.click()}
                    className='font-medium text-primary-700 hover:underline dark:text-primary-400'>
                    browse
                  </button>
                </p>
                <p className='text-xs text-muted-foreground'>JPG, PNG, WebP, GIF or AVIF · up to 5MB each</p>
              </>
            )}
          </div>
        ) : (
          <div className='flex flex-col gap-2 py-2 sm:flex-row'>
            <input
              type='url'
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter in a field nested in a <form> would submit the form.
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addUrl();
                }
              }}
              placeholder='https://…'
              aria-label={`${label} image link`}
              className='flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-gray-800 dark:text-white'
            />
            <Button type='button' variant='outline' onClick={addUrl} disabled={!urlDraft.trim()}>
              Add
            </Button>
          </div>
        )}

        <input
          id={inputId}
          ref={inputRef}
          type='file'
          accept={ACCEPT}
          multiple={multiple}
          className='sr-only'
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {error ? (
        <p className='text-xs text-red-600 dark:text-red-400'>{error}</p>
      ) : hint ? (
        <p className='text-xs text-muted-foreground'>{hint}</p>
      ) : null}
    </div>
  );
};

export default ImageUploader;
