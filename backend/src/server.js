import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────────────────
// CRITICAL: Load environment variables BEFORE any other imports that need them.
// In ES Modules, static imports are evaluated before top-level code.
// Dynamic imports ensure process.env is fully loaded before modules evaluate.
// ──────────────────────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Now dynamically import app modules after process.env is initialized
const { default: app } = await import('./app.js');
const { initializeDatabase } = await import('./config/database.js');
const { initSocket } = await import('./config/socket.js');

// ──────────────────────────────────────────────────────────────────────────
// Bootstrap: Connect DB first, THEN start Express listener.
// This ensures the database is ready before accepting any HTTP requests.
// ──────────────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // Step 1: Establish database connection
    await initializeDatabase();

    // Step 2: Start Express HTTP server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`[VANGUARD-SERVER] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Step 3: Initialize Socket.IO on the running server
    initSocket(server);

    // Step 4: Graceful shutdown on critical errors
    process.on('unhandledRejection', (err) => {
      console.error(`[SYSTEM-ERROR] Unhandled Promise Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

  } catch (error) {
    console.error(`[VANGUARD-SERVER] Fatal startup error: ${error.message}`);
    process.exit(1);
  }
};

startServer();
