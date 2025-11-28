const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getDashboardOverview,
  updateAvailability,
  updateProfile,
  listAppointments,
  listPatients,
  updateAppointmentStatus,
  getPatientDetails,
} = require('../controllers/doctorController');

const router = express.Router();

router.use(authenticate, authorize('doctor'));

router.get('/dashboard', getDashboardOverview);
router.put('/availability', updateAvailability);
router.put('/profile', updateProfile);
router.get('/appointments', listAppointments);
router.get('/patients', listPatients);
router.patch('/appointments/:appointmentId', updateAppointmentStatus);
router.get('/patients/:patientId', getPatientDetails);

module.exports = router;
