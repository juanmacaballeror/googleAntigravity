require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');

// Routes
const authRoutes        = require('./routes/auth.routes');
const propertyRoutes    = require('./routes/property.routes');
const visitRoutes       = require('./routes/visit.routes');
const contractRoutes    = require('./routes/contract.routes');
const commissionRoutes  = require('./routes/commission.routes');
const expenseRoutes     = require('./routes/expense.routes');
const diaryRoutes       = require('./routes/diary.routes');
const dashboardRoutes   = require('./routes/dashboard.routes');
const clientRoutes      = require('./routes/client.routes');

const app = express();

// ─── Middlewares globales ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:9000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Directorio estático para PDFs generados
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Rutas de la API ───────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/properties',  propertyRoutes);
app.use('/api/visits',      visitRoutes);
app.use('/api/contracts',   contractRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/expenses',    expenseRoutes);
app.use('/api/diary',       diaryRoutes);
app.use('/api/clients',     clientRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error handler global ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🏠 CRM Inmobiliario API corriendo en http://localhost:${PORT}`);
  console.log(`📋 Entorno: ${process.env.NODE_ENV}`);
});

module.exports = app;
