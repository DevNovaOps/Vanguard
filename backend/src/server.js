import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';

// Load environmental variables
dotenv.config();

// Establish Database Connection
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[VANGUARD-SERVER] Running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown on critical signals
process.on('unhandledRejection', (err) => {
  console.error(`[SYSTEM-ERROR] Unhandled Promise Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
