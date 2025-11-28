const jwt = require('jsonwebtoken');

const signToken = (payload, options = {}) => {
  const secret = process.env.JWT_SECRET || 'dev_secret_key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn, ...options });
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'dev_secret_key';
  return jwt.verify(token, secret);
};

module.exports = {
  signToken,
  verifyToken,
};
