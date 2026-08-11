import { StatusCodes } from 'http-status-codes';
import { BadRequestError } from '../errors/customErrors.js';
import {
  assertUsableImage,
  cloudinaryConfigured,
  normalizeImage,
  publicOrigin,
  storeImage,
} from '../utils/imageStorage.js';

// Every product image in the app — the shop grid, the PDP hero, the PDP
// thumbnail strip, this very uploader's own preview — renders inside a square
// frame with `object-contain`. CSS papers over a mismatched source today, but
// the stored asset should actually be that shape: consistent dimensions for
// anywhere the image gets used later (an OG tag, an export, a future email),
// and no vendor ships a 4000×3000 phone photo as a "thumbnail".
const CANVAS = 1600;

// POST /api/v1/uploads/images — one or many files under the field `images`.
export const uploadImages = async (req, res) => {
  const provided = req.files?.images;
  if (!provided) throw new BadRequestError('No image was uploaded.');

  const files = Array.isArray(provided) ? provided : [provided];
  if (files.length > 8) throw new BadRequestError('Upload at most 8 images at a time.');

  files.forEach(assertUsableImage);
  const origin = publicOrigin(req);

  const images = await Promise.all(
    files.map(async (file) => {
      const { buffer, ext } = await normalizeImage(file, { canvas: CANVAS, mode: 'pad' });
      const stored = await storeImage(buffer, ext, { subdir: 'products', origin });
      return { ...stored, name: file.name };
    }),
  );

  res.status(StatusCodes.CREATED).json({
    success: true,
    images,
    storage: cloudinaryConfigured ? 'cloudinary' : 'local',
  });
};

/**
 * POST /api/v1/uploads/category-image — one file under `image`.
 *
 * Cropped, not padded, and wider than it is tall. A category thumbnail is
 * decoration behind a label — it fills a tile in the storefront's category row
 * and a 40px cell in the admin table, and in both it is cropped to fit
 * whatever box it lands in. Padding it to a square, the way a product photo is
 * padded, would bake letterbox bars into the stored asset and then crop *those*
 * — so the cover crop happens once, here, at a size the tiles never exceed.
 */
const CATEGORY_WIDTH = 800;
const CATEGORY_HEIGHT = 500;

export const uploadCategoryImage = async (req, res) => {
  const provided = req.files?.image;
  if (!provided) throw new BadRequestError('No image was uploaded.');

  const file = Array.isArray(provided) ? provided[0] : provided;
  assertUsableImage(file);

  const { buffer, ext } = await normalizeImage(file, {
    canvas: { width: CATEGORY_WIDTH, height: CATEGORY_HEIGHT },
    mode: 'cover',
  });
  const stored = await storeImage(buffer, ext, {
    subdir: 'categories',
    origin: publicOrigin(req),
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    image: { ...stored, name: file.name },
    storage: cloudinaryConfigured ? 'cloudinary' : 'local',
  });
};
