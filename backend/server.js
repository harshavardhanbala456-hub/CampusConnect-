// backend/server.js — Express entry point
require('dotenv').config();
const express = require('express');
const cors    = require('cors');

// Import DB pool (triggers connection test on startup)
require('./db');

const authRoutes         = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const { attachUser }     = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Decode JWT and attach req.user on every request (non-blocking)
app.use(attachUser);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/announcements', announcementRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  CampusConnect API running at http://localhost:${PORT}`);
});
