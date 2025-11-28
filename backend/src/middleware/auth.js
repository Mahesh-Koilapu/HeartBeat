const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { roles } = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);

    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing' });
    }

    const secret = process.env.JWT_SECRET || 'dev_secret_key';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  roles,
};
