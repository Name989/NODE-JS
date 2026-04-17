require('./config/env');
const sequelize = require('./config/database');
const app = require('./app');

require('./models/User');
require('./models/RefreshToken');

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  await sequelize.authenticate();
  console.log('[DB] Connection established.');

  app.listen(PORT, () => {
    console.log(`[SERVER] Running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[FATAL] Failed to start server:', err.message);
  process.exit(1);
});
