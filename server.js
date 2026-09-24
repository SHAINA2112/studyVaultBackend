import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(
      `[server] SHAINA StudyVault API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`
    );
  });

  process.on('unhandledRejection', (err) => {
    console.error('[server] Unhandled rejection:', err.message);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    console.log('[server] SIGTERM received, shutting down gracefully');
    server.close(() => process.exit(0));
  });
}

start();