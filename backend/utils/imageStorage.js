import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { BadRequestError } from '../errors/customErrors.js';

/**
 * Shared image intake: validate → normalise with sharp → store.
 *
 * Product images and avatars both go through here so an avatar can't quietly
 * skip the parts that matter — the mimetype allowlist, the size cap, the EXIF
 * rotation, and above all the storage fallback. The avatar path used to upload
 * straight to Cloudinary, which meant "Change photo" simply failed on any
 * install without `CLOUDINARY_*` set (the default for local development).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.join(__dirname, '..', 'public', 'uploads');

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const MAX_BYTES = 5 * 1024 * 1024;

// Cloudinary is used when it's configured and local disk otherwise, so the app
// works out of the box in this demo but doesn't need re-plumbing to go live.
// Disk storage is fine locally; on an ephemeral host (Render, Fly, a container)
// uploads vanish on redeploy, which is exactly when you'd add the credentials.
export const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * The Product schema requires `thumbnail` to match `^https?://`, and the
 * frontend drops stored values straight into an <img src>, so paths have to be
 * absolute. Prefer the configured API_URL's origin over the request host —
 * behind a proxy `req.get('host')` is whatever the proxy passed along.
 */
export const publicOrigin = (req) => {
  // Only in production: PROD_API_URL ships as a `yourdomain.com` placeholder,
  // and preferring it in dev bakes a dead host into every uploaded image URL.
  const configured = /production/.test(process.env.NODE_ENV || '')
    ? process.env.PROD_API_URL || process.env.API_URL
    : null;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* fall through to the request */
    }
  }
  return `${req.protocol}://${req.get('host')}`;
};

const uniqueName = (ext) => `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

export const assertUsableImage = (file) => {
  const ext = ALLOWED[file.mimetype];
  if (!ext) {
    throw new BadRequestError(
      `${file.name}: only JPG, PNG, WebP, GIF and AVIF images can be uploaded.`,
    );
  }
  if (file.size > MAX_BYTES) {
    throw new BadRequestError(`${file.name} is larger than 5MB.`);
  }
  return ext;
};

/**
 * Re-encode to WebP at a square `canvas`.
 *
 *  - `mode: 'pad'` (products) never crops — a vendor's product would lose an
 *    edge — so it fits inside the box and pads out to square.
 *  - `mode: 'cover'` (avatars) crops to fill, because an avatar is displayed in
 *    a circle and padding would show as dead space around the face.
 *
 * GIFs pass through untouched: sharp would flatten an animation to its first
 * frame, which is a worse result than leaving it alone.
 */
export const normalizeImage = async (file, { canvas = 1600, mode = 'pad' } = {}) => {
  if (file.mimetype === 'image/gif') {
    return { buffer: await fs.readFile(file.tempFilePath), ext: '.gif' };
  }

  if (mode === 'cover') {
    // `canvas` is a side length for the square crops (avatars), or an explicit
    // `{ width, height }` for the ones that aren't square — a category banner
    // is a landscape tile, and cropping it square here would only mean
    // cropping it again in the browser.
    const width = canvas?.width ?? canvas;
    const height = canvas?.height ?? canvas;

    const buffer = await sharp(file.tempFilePath)
      .rotate()
      .resize({ width, height, fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer, ext: '.webp' };
  }

  const fitted = await sharp(file.tempFilePath)
    .rotate() // bakes in the EXIF orientation so a sideways phone photo displays upright
    .resize({ width: canvas, height: canvas, fit: 'inside', withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const side = Math.max(fitted.info.width, fitted.info.height);
  const padTop = Math.floor((side - fitted.info.height) / 2);
  const padLeft = Math.floor((side - fitted.info.width) / 2);

  const buffer = await sharp(fitted.data)
    .extend({
      top: padTop,
      bottom: side - fitted.info.height - padTop,
      left: padLeft,
      right: side - fitted.info.width - padLeft,
      // Transparent padding on a format that supports it; solid white behind
      // a flattened JPEG, so a portrait photo doesn't grow a black bar.
      background: fitted.info.hasAlpha ? { r: 255, g: 255, b: 255, alpha: 0 } : '#ffffff',
    })
    .webp({ quality: 82 })
    .toBuffer();

  return { buffer, ext: '.webp' };
};

const uploadBufferToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });

/**
 * Persist a normalised buffer under `subdir` ('products', 'avatars') and return
 * the absolute URL plus, on Cloudinary, the `publicId` needed to delete it
 * later. Local files have no publicId — `deleteStoredImage` works off the URL.
 */
export const storeImage = async (buffer, ext, { subdir, origin }) => {
  if (cloudinaryConfigured) {
    const result = await uploadBufferToCloudinary(buffer, `bazaarke/${subdir}`);
    return { url: result.secure_url, publicId: result.public_id };
  }

  const dir = path.join(UPLOAD_ROOT, subdir);
  await fs.mkdir(dir, { recursive: true });
  const filename = uniqueName(ext);
  await fs.writeFile(path.join(dir, filename), buffer);
  return { url: `${origin}/uploads/${subdir}/${filename}` };
};

/**
 * Best-effort cleanup of a replaced asset. Never throws: failing to delete the
 * *old* image is not a reason to fail the request that uploaded the new one,
 * and the caller has usually already saved by this point.
 *
 * The local branch only unlinks paths under our own uploads root, so a stored
 * URL pointing anywhere else (a seeded remote image, a hand-edited value) is
 * left alone rather than being resolved into an arbitrary filesystem path.
 */
export const deleteStoredImage = async ({ publicId, url } = {}) => {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      return;
    }
    if (!url) return;

    const { pathname } = new URL(url);
    const match = /^\/uploads\/([\w-]+)\/([\w.-]+)$/.exec(pathname);
    if (!match) return;

    const target = path.join(UPLOAD_ROOT, match[1], match[2]);
    if (!target.startsWith(UPLOAD_ROOT + path.sep)) return;
    await fs.unlink(target);
  } catch {
    /* the asset is already gone, unreachable, or not ours to delete */
  }
};
