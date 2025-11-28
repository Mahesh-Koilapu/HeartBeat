require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const patientRoutes = require('./src/routes/patientRoutes');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Heart Beat API running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
