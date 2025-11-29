require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const userRoutes = require('./src/routes/userRoutes');

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
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
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
