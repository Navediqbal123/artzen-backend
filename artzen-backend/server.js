require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const apiRoutes = require('./src/routes/index');
const adminRoutes = require('./src/routes/adminRoutes');
const { fail } = require('./src/utils/response');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*'
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'artzen-backend' }));

app.use('/api', apiRoutes);

// Hidden admin panel — mount path comes from env, never exposed in public API docs
const ADMIN_PATH = process.env.ADMIN_PANEL_PATH || '/api/zen-control-x9k2';
app.use(ADMIN_PATH, adminRoutes);

app.use((req, res) => fail(res, 'Route not found', 404));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  fail(res, err.message || 'Internal server error', err.status || 500);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`ARTZEN backend running on port ${PORT}`));
