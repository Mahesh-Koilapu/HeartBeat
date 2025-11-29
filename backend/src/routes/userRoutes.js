const express = require('express');
const { body } = require('express-validator');
const {
  listDoctors,
  createAppointment,
  listAppointments,
  updateAppointment,
  getDashboardOverview,
  getDoctorProfile,
  getProfile,
  updateProfile,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('user'));

router.get('/dashboard', getDashboardOverview);
router.get('/doctors', listDoctors);
router.get('/doctors/:doctorId', getDoctorProfile);
router.get('/appointments', listAppointments);
router.get('/profile', getProfile);
router.post(
  '/appointments',
  [
    body('diseaseCategory').notEmpty(),
    body('preferredDate').notEmpty(),
  ],
  createAppointment
);
router.patch('/appointments/:appointmentId', updateAppointment);
router.put('/profile', updateProfile);

module.exports = router;
