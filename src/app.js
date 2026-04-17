const express = require('express');
const authRoutes = require('./routes/auth.routes');
const authMiddleware = require('./middleware/auth.middleware');

const app = express();

app.use(express.json());

app.use('/auth', authRoutes);

app.get('/protected', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  if (status === 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({ success: false, message });
});

module.exports = app;
