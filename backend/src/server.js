import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environmental variables relative to the server script location
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Establish Database Connection
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[VANGUARD-SERVER] Running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Initialize Socket.IO
initSocket(server);

// Graceful shutdown on critical signals
process.on('unhandledRejection', (err) => {
  console.error(`[SYSTEM-ERROR] Unhandled Promise Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Trigger nodemon restart
