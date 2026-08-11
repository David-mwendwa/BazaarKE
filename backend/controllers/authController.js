import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { StatusCodes } from 'http-status-codes';
import User, { DEFAULT_AVATAR, isCustomAvatar } from '../models/User.js';
import {
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../errors/customErrors.js';
import sendToken from '../utils/jwt.js';
import { mailConfigured, sendTemplate } from '../utils/mailer.js';
import { passwordReset, welcome } from '../utils/emailTemplates.js';
import {
  assertUsableImage,
  deleteStoredImage,
  normalizeImage,
  publicOrigin,
  storeImage,
} from '../utils/imageStorage.js';

// Register user => /api/v1/register
export const registerUser = async (req, res) => {
  const userData = { ...req.body };

  // Only add avatar if file was uploaded
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'avatars',
      width: 150,
      crop: 'scale',
    });
    userData.avatar = {
      public_id: result.public_id,
      url: result.secure_url,
    };
  }

  const user = await User.create(userData);

  // Fire the welcome message before responding but never on the response's
  // critical path in the sense that matters: `sendTemplate` resolves to a
  // result instead of throwing, so a mail server that is slow, misconfigured
  // or absent can't turn a successful registration into a 500 for someone
  // whose account has already been created. Where it goes is decided per
  // address — see `utils/mailer.js`.
  await sendTemplate(user.email, welcome({ user }));

  sendToken(user, StatusCodes.CREATED, res);
};

// login user => /api/v1/login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new BadRequestError('Please enter email and password');
  }
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new BadRequestError('Incorrect email or password');
  }
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new BadRequestError('Incorrect email or password');
  }
  sendToken(user, StatusCodes.OK, res);
};

/**
 * ## Password reset
 *
 * Four things were wrong with the pair below before:
 *
 *  - The emailed link pointed at **the API** —
 *    `${protocol}://${host}/api/v1/password/reset/${token}` — so following it
 *    opened a JSON endpoint that doesn't even answer GET. The reset page is a
 *    frontend route; the link has to go there. (The code carried a TODO
 *    saying exactly this, with the right URL commented out beneath it.)
 *  - An unknown address got a 404 "User not found", which turns the form into
 *    a way to test whether someone has an account here. It answers the same
 *    way for every address now.
 *  - `resetPassword` set `user.password` and saved, but the schema requires
 *    `passwordConfirm` — so the save threw a validation error and no password
 *    could ever actually be reset.
 *  - The subject line read "ShopIT Password Recovery", the name of the
 *    tutorial project this was lifted from.
 */

// forgot password => POST /api/v1/password/forgot
export const forgotPassword = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email });

  // Same response either way — see the note above. The work below only
  // happens when there's an account, but the caller can't tell.
  const genericResponse = {
    success: true,
    message:
      'If that email has an account, a reset link is on its way. Check your inbox and your spam folder.',
  };

  if (!user) {
    return res.status(StatusCodes.OK).json(genericResponse);
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5183';
  const resetUrl = `${frontendUrl}/password/reset/${resetToken}`;

  const result = await sendTemplate(user.email, passwordReset({ user, resetUrl }));

  if (result.delivered) {
    return res.status(StatusCodes.OK).json(genericResponse);
  }

  // Reset is the one flow with nothing to fall back on — the user is locked
  // out and the link is the entire remedy. Outside production it goes to the
  // server log and back in the response so the flow stays walkable with no
  // mail server at all. Never in production, where a failed send has to stay
  // a failure rather than handing a reset link to whoever asked for it.
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`Email not sent (${result.reason}). Password reset link: ${resetUrl}`);
    return res.status(StatusCodes.OK).json({
      ...genericResponse,
      devResetUrl: resetUrl,
      devNote: mailConfigured()
        ? `The mail server rejected the message (${result.reason}), so the link is returned here instead.`
        : 'No mail server is configured, so the link is returned here instead of emailed.',
    });
  }

  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save({ validateBeforeSave: false });
  throw new InternalServerError('Could not send the reset email. Please try again later.');
};

// reset password => PATCH /api/v1/password/reset/:token
export const resetPassword = async (req, res) => {
  // The token in the link is the plain one; only its hash is stored.
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new BadRequestError('That reset link is invalid or has expired. Please request a new one.');
  }

  const { password, confirmPassword, passwordConfirm } = req.body;
  const confirmation = confirmPassword ?? passwordConfirm;

  if (!password) {
    throw new BadRequestError('Please choose a new password');
  }
  if (password !== confirmation) {
    throw new BadRequestError('Passwords do not match');
  }

  user.password = password;
  // Required by the schema's own match validator; a pre-save hook clears it
  // again before the document is written. Without it the save threw and the
  // reset silently failed.
  user.passwordConfirm = confirmation;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  // Signs them straight in — they've just proved control of the address.
  sendToken(user, StatusCodes.OK, res);
};

// Get currently logged in user details => /api/v1/me
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(StatusCodes.OK).json({
    success: true,
    user,
  });
};

// Update / Change password => /api/v1/password/update
export const updatePassword = async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Basic validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(
      new BadRequestError(
        'Please provide current password, new password, and confirm password'
      )
    );
  }
  try {
    // Find user with password field
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return next(new BadRequestError('User not found'));
    }
    // Verify current password
    const isMatched = await user.comparePassword(currentPassword);
    if (!isMatched) {
      return next(new BadRequestError('Current password is incorrect'));
    }
    // Validate new password matches confirm password
    if (newPassword !== confirmPassword) {
      return next(
        new BadRequestError('New password and confirm password do not match')
      );
    }
    // Set both password and passwordConfirm to pass validation
    user.password = newPassword;
    user.passwordConfirm = newPassword; // Add this line
    user.passwordChangedAt = Date.now();

    // Save the user (this will trigger the pre-save middleware)
    await user.save();
    // Generate new token and send response
    sendToken(user, StatusCodes.OK, res);
  } catch (error) {
    console.error('Error updating password:', error);
    next(error);
  }
};

/**
 * Update the signed-in user's own profile => PATCH /api/v1/me/update
 *
 * Accepts JSON or multipart (the profile page sends multipart whenever an
 * avatar is involved), so every scalar arrives as a string.
 *
 * `email` is deliberately NOT updatable here. It's the login identifier and
 * carries a unique index, so a collision would surface as a raw Mongo 11000
 * rather than a message anyone can act on, and there's no re-verification flow
 * to reset `isEmailVerified` against. Changing an email is an admin action
 * (`PATCH /admin/user/:id`) until that flow exists.
 */
export const updateProfile = async (req, res) => {
  // Get the user
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: 'User not found',
    });
  }
  // Update basic user data if provided
  if (req.body.firstName) user.firstName = req.body.firstName;
  if (req.body.lastName) user.lastName = req.body.lastName;
  // Phone is the one field a user is allowed to blank out again, so it's
  // assigned on presence rather than on truthiness like the names above.
  // Clearing it has to unset the path rather than store '': the schema's
  // validator requires at least one digit and runs on an empty string, so
  // assigning '' would reject the save instead of emptying the field.
  if (req.body.phone !== undefined) user.phone = req.body.phone.trim() || undefined;
  // Handle addresses if provided in the request
  if (req.body.addresses && Array.isArray(req.body.addresses)) {
    // Create a new array for addresses
    user.addresses = req.body.addresses.map((address) => ({
      type: address.type || 'home',
      isDefault: Boolean(address.isDefault),
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      company: address.company || '',
      address1: address.address1 || '',
      address2: address.address2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || 'Kenya',
      phone: address.phone || '',
      additionalInfo: address.additionalInfo || '',
      ...(address._id && { _id: address._id }),
    }));
  }
  // The previous asset, captured before `user.avatar` is reassigned. Deleting
  // it is deferred until after the save succeeds — a failed validation would
  // otherwise leave the account pointing at a file that no longer exists.
  const previousAvatar = isCustomAvatar(user.avatar) ? { ...user.avatar } : null;
  let avatarChanged = false;

  // Handle avatar removal if requested
  if (req.body.removeAvatar === 'true') {
    // Back to the placeholder rather than null: `avatar` is a nested path with
    // its own defaults, and nulling it turns every `avatar.url` read
    // downstream into a potential crash.
    user.avatar = { ...DEFAULT_AVATAR };
    avatarChanged = Boolean(previousAvatar);
  }
  // Handle new avatar upload if provided
  else if (req.files?.avatar) {
    const file = Array.isArray(req.files.avatar) ? req.files.avatar[0] : req.files.avatar;
    assertUsableImage(file);

    // 'cover' at 256px: an avatar is displayed in a circle, so it's cropped to
    // fill rather than padded to square the way a product photo is.
    const { buffer, ext } = await normalizeImage(file, { canvas: 256, mode: 'cover' });
    const stored = await storeImage(buffer, ext, {
      subdir: 'avatars',
      origin: publicOrigin(req),
    });

    user.avatar = { url: stored.url, public_id: stored.publicId || '' };
    avatarChanged = true;
  }

  // `validateModifiedOnly` rather than `validateBeforeSave: false`: the reason
  // validation had to be skipped at all is `passwordConfirm`, which is required
  // on the schema but stripped by the pre-save hook and never modified here.
  // Turning validation off wholesale also let an invalid phone number through.
  try {
    await user.save({ validateModifiedOnly: true });
  } catch (err) {
    // A bad phone number is the user's mistake, not the server's. The dev
    // branch of the error handler doesn't map Mongoose errors the way the
    // production branch does, so it would otherwise surface as a 500.
    if (err.name === 'ValidationError') {
      throw new BadRequestError(
        Object.values(err.errors)
          .map((e) => e.message)
          .join('; '),
      );
    }
    throw err;
  }

  if (avatarChanged && previousAvatar) {
    await deleteStoredImage({ publicId: previousAvatar.public_id, url: previousAvatar.url });
  }

  // Get the updated user with populated fields if needed
  const updatedUser = await User.findById(user._id).select('-password');
  res.status(StatusCodes.OK).json({
    success: true,
    user: updatedUser,
  });
};

// logout user => /api/v1/logout
export const logout = async (req, res) => {
  res.cookie('token', null, { expires: new Date(Date.now()), httpOnly: true });
  res.status(StatusCodes.OK).json({ success: true, message: 'Logged out' });
};

// Get all users => /api/v1/admin/users
export const allUsers = async (req, res) => {
  const users = await User.find({});
  res.status(StatusCodes.OK).json({ success: true, users });
};

// Get user details => /api/v1/admin/user/:id
export const getUserDetails = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError(`No user found with id: ${req.params.id}`);
  }
  res.status(StatusCodes.OK).json({ success: true, user });
};

// Update user profile - admin => /api/v1/admin/user/:id
export const updateUser = async (req, res) => {
  const newUserData = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    role: req.body.role,
  };

  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
  });
  res.status(StatusCodes.OK).json({ success: true, user });
};

// Get user details => /api/v1/admin/user/:id
export const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError(`No user found with id: ${req.params.id}`);
  }

  // Only remove from Cloudinary if this user actually has a non-default,
  // Cloudinary-hosted avatar — the seeded default avatar isn't one, and
  // Cloudinary isn't configured in this project anyway (see CLAUDE.md).
  if (user.avatar?.public_id && user.avatar.public_id !== 'default-avatar') {
    await cloudinary.v2.uploader.destroy(user.avatar.public_id);
  }

  await user.deleteOne();
  res
    .status(StatusCodes.OK)
    .json({ success: true, msg: 'User deleted successfully' });
};
