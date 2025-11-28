const express = require('express');
const { body } = require('express-validator');
const { register, login, getProfile, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'doctor', 'patient']).withMessage('Invalid role'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authenticate, getProfile);
router.post('/logout', authenticate, logout);

module.exports = router;
