import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import Question from '../models/Question.js';
import Product from '../models/Product.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from '../errors/customErrors.js';

/**
 * Questions and answers on a product.
 *
 * Reading is public, for the same reason reading reviews is: a shopper decides
 * whether to buy before they decide whether to register, and answers that are
 * only visible to people with accounts help nobody choose.
 *
 * Asking needs an account (there has to be someone to answer). Answering is
 * limited to the product's vendor and to admins — an answer carries a badge
 * saying it came from the seller, and that badge is the only reason it's worth
 * more than a comment.
 */

const displayName = (user) => {
  if (!user) return 'Someone';
  const name = [user.firstName, user.lastName?.[0] ? `${user.lastName[0]}.` : '']
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || 'Someone';
};

/**
 * The shape both the product page and the vendor queue read.
 *
 * Only a first name and a last initial go out. A public Q&A thread with full
 * names attached is a list of who bought what, and nobody asking whether a
 * charger fits their phone is consenting to that.
 */
const shape = (question, viewerId) => ({
  _id: question._id,
  body: question.body,
  createdAt: question.createdAt,
  askedBy: displayName(question.user),
  isMine: Boolean(viewerId) && String(question.user?._id || question.user) === String(viewerId),
  isAnswered: Boolean(question.answers?.length),
  answers: (question.answers || []).map((answer) => ({
    _id: answer._id,
    body: answer.body,
    createdAt: answer.createdAt,
    authorRole: answer.authorRole,
    author:
      answer.authorRole === 'admin'
        ? 'BazaarKE'
        : answer.author?.vendorInfo?.businessName || displayName(answer.author),
  })),
});

const POPULATE = [
  { path: 'user', select: 'firstName lastName' },
  { path: 'answers.author', select: 'firstName lastName vendorInfo.businessName' },
];

/** GET /api/v1/products/:id/questions — public, paginated. */
export const getProductQuestions = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 5));

  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new BadRequestError('Not a valid product id.');
  }

  const filter = { product: req.params.id, isPublished: true };
  const viewerId = req.user?.id || req.user?._id?.toString();

  const [questions, total, answered] = await Promise.all([
    Question.find(filter)
      // Answered first: an unanswered question is a dead end for the next
      // shopper reading, and the whole point of the section is the answers.
      .sort({ isAnswered: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE)
      .lean(),
    Question.countDocuments(filter),
    Question.countDocuments({ ...filter, isAnswered: true }),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    questions: questions.map((question) => shape(question, viewerId)),
    total,
    answered,
    page,
    totalPages: Math.ceil(total / limit) || 0,
  });
};

/** POST /api/v1/products/:id/questions — any signed-in account. */
export const askQuestion = async (req, res) => {
  const body = String(req.body.body || '').trim();

  if (!body) throw new BadRequestError('Write your question first.');
  if (body.length > 500) {
    throw new BadRequestError('Keep it under 500 characters — ask a second question if you need to.');
  }

  const product = await Product.findById(req.params.id).select('vendor name').lean();
  if (!product) throw new NotFoundError('That product no longer exists.');

  const userId = req.user.id || req.user._id?.toString();

  // A seller answering their own question is a testimonial with extra steps.
  if (product.vendor && String(product.vendor) === String(userId)) {
    throw new BadRequestError("This is your own product — answer questions on it instead of asking.");
  }

  // One open question at a time per product. Without this the box is a
  // comment thread, and the vendor queue fills with the same person's
  // rephrasings of one question.
  const pending = await Question.countDocuments({
    product: product._id,
    user: userId,
    isAnswered: false,
  });
  if (pending > 0) {
    throw new BadRequestError(
      "You've already asked about this product — we'll answer that one first.",
    );
  }

  const question = await Question.create({
    product: product._id,
    vendor: product.vendor || null,
    user: userId,
    body,
  });

  await question.populate(POPULATE);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Asked — you'll see the answer here once the seller replies.",
    question: shape(question.toObject(), userId),
  });
};

/**
 * POST /api/v1/questions/:id/answers — the product's vendor, or an admin.
 *
 * A question can hold more than one answer: the seller's, and an admin's when
 * the seller has gone quiet. Neither replaces the other.
 */
export const answerQuestion = async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) throw new BadRequestError('Write your answer first.');
  if (body.length > 1000) throw new BadRequestError('Keep the answer under 1000 characters.');

  const question = await Question.findById(req.params.id);
  if (!question) throw new NotFoundError('That question no longer exists.');

  const userId = req.user.id || req.user._id?.toString();
  const isAdmin = req.user.role === 'admin';
  const isSeller = question.vendor && String(question.vendor) === String(userId);

  if (!isAdmin && !isSeller) {
    throw new UnauthenticatedError('Only the seller of this product can answer it.');
  }

  question.answers.push({ body, author: userId, authorRole: isAdmin ? 'admin' : 'vendor' });
  await question.save();
  await question.populate(POPULATE);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Answer posted.',
    question: shape(question.toObject(), userId),
  });
};

/** DELETE /api/v1/questions/:id — the person who asked, or an admin. */
export const deleteQuestion = async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw new NotFoundError('That question no longer exists.');

  const userId = req.user.id || req.user._id?.toString();
  const isOwner = String(question.user) === String(userId);

  if (!isOwner && req.user.role !== 'admin') {
    throw new UnauthenticatedError('You can only delete your own question.');
  }

  await question.deleteOne();

  res.status(StatusCodes.OK).json({ success: true, message: 'Question removed.' });
};

/**
 * PATCH /api/v1/questions/:id — admin moderation.
 *
 * Only `isPublished`. Editing what somebody asked, under their name, is not
 * moderation.
 */
export const moderateQuestion = async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw new NotFoundError('That question no longer exists.');

  question.isPublished = Boolean(req.body.isPublished);
  await question.save();

  res.status(StatusCodes.OK).json({
    success: true,
    message: question.isPublished ? 'Question is visible again.' : 'Question hidden from the product page.',
  });
};

/**
 * GET /api/v1/vendor/questions — the seller's queue.
 *
 * Unanswered first and oldest first within that, so the person who has been
 * waiting longest is at the top. This is the only screen where the answer half
 * of the feature is discoverable: a vendor is never going to find questions by
 * browsing their own product pages.
 */
export const getVendorQuestions = async (req, res) => {
  const { state = 'unanswered', page = 1, limit = 20 } = req.query;

  const vendorId =
    req.user.role === 'admin' && req.query.vendorId
      ? req.query.vendorId
      : req.user.id || req.user._id?.toString();

  if (!mongoose.isValidObjectId(vendorId)) {
    throw new BadRequestError('Not a valid vendor id.');
  }

  const scope = { vendor: vendorId };
  const filter =
    state === 'answered'
      ? { ...scope, isAnswered: true }
      : state === 'all'
        ? scope
        : { ...scope, isAnswered: false };

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 20));

  const [questions, total, unanswered] = await Promise.all([
    Question.find(filter)
      .sort({ isAnswered: 1, createdAt: state === 'answered' ? -1 : 1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .populate([...POPULATE, { path: 'product', select: 'name slug thumbnail' }])
      .lean(),
    Question.countDocuments(filter),
    Question.countDocuments({ ...scope, isAnswered: false }),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    questions: questions.map((question) => ({
      ...shape(question, vendorId),
      isPublished: question.isPublished !== false,
      product: question.product
        ? {
            _id: question.product._id,
            name: question.product.name,
            thumbnail: question.product.thumbnail,
          }
        : null,
    })),
    pagination: {
      page: pageNum,
      limit: perPage,
      total,
      pages: Math.ceil(total / perPage) || 0,
    },
    unanswered,
  });
};
