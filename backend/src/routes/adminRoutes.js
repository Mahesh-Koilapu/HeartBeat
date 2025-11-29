const express = require('express');
const { body } = require('express-validator');
const {
  listDoctors,
  createDoctor,
  updateDoctorStatus,
  deleteDoctor,
  listUsers,
  getAppointments,
  assignDoctor,
  updateAppointmentStatus,
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/doctors', listDoctors);
router.post(
  '/doctors',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('specialization').trim().notEmpty().withMessage('Specialization is required'),
    body('experience').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Experience must be positive'),
  ],
  createDoctor
);
router.patch('/doctors/:doctorId/status', [body('isActive').isBoolean()], updateDoctorStatus);
router.delete('/doctors/:doctorId', deleteDoctor);

router.get('/users', listUsers);
router.get('/patients', listUsers);

router.get('/appointments', getAppointments);
router.post('/appointments/:appointmentId/assign', [body('doctorId').notEmpty()], assignDoctor);
router.patch('/appointments/:appointmentId', updateAppointmentStatus);

module.exports = router;
