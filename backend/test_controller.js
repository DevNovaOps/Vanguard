import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendResetLink } from './src/controllers/authController.js';
import User from './src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

async function run() {
  // Connect to DB
  await mongoose.connect(process.env.MONGO_URI);
  
  // Setup mock request and response
  const req = {
    body: { email: 'admin123@gmail.com' },
    protocol: 'http',
    get: (headerName) => {
      if (headerName === 'host') {
        return '127.0.0.1:5000';
      }
      return '';
    }
  };

  const res = {
    status: (statusCode) => {
      console.log('Response status:', statusCode);
      return res;
    },
    json: (data) => {
      console.log('Response json:', data);
      return res;
    }
  };

  const next = (err) => {
    if (err) console.error('Next called with error:', err);
  };

  console.log('Calling sendResetLink directly...');
  await sendResetLink(req, res, next);

  mongoose.connection.close();
  process.exit(0);
}

run().catch(console.error);
