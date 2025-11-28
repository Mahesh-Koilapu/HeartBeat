const express = require('express');
const { body } = require('express-validator');
const {
  listDoctors,
  createDoctor,
  updateDoctorStatus,
  deleteDoctor,
  listPatients,
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
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('specialization').notEmpty(),
  ],
  createDoctor
);
router.patch('/doctors/:doctorId/status', [body('isActive').isBoolean()], updateDoctorStatus);
router.delete('/doctors/:doctorId', deleteDoctor);

router.get('/patients', listPatients);

router.get('/appointments', getAppointments);
router.post('/appointments/:appointmentId/assign', [body('doctorId').notEmpty()], assignDoctor);
router.patch('/appointments/:appointmentId', updateAppointmentStatus);

module.exports = router;
