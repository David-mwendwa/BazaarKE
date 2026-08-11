// create, send token & save in the cookie.
const sendToken = (user, statusCode, res) => {
  // craete jwt
  const token = user.getJwtToken();

  // options for cookie
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_LIFETIME * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  // `password` has `select: false` on the schema, but that only guards
  // find()/findOne() queries — documents from .create() or a query using
  // .select('+password') (as login does, to compare it) still carry the
  // hash in memory, so it must be stripped before this document is
  // serialized into the response.
  const safeUser = user.toObject();
  delete safeUser.password;

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: safeUser,
  });
};

export default sendToken;
