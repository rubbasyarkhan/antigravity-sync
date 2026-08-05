/**
 * Antigravity Sync Server — Main Express Application Entry Point
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authGithubRoute = require('./auth/github');
const authCallbackRoute = require('./auth/callback');
const workspaceRoute = require('./workspace');
const assignmentsRoute = require('./assignments');
const invitesRoute = require('./invites');
const geminiConfigRoute = require('./gemini-config');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Antigravity Sync Server',
    timestamp: new Date().toISOString(),
  });
});

// Route mounts
app.use('/auth/github', authGithubRoute);
app.use('/auth/github/callback', authCallbackRoute);
app.use('/workspace', workspaceRoute);
app.use('/assignments', assignmentsRoute);
app.use('/invites', invitesRoute);
app.use('/gemini-config', geminiConfigRoute);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start local HTTP server when not running in serverless environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Antigravity Sync Server running at http://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/`);
    console.log(`   GitHub OAuth Login: http://localhost:${PORT}/auth/github\n`);
  });
}

module.exports = app;
