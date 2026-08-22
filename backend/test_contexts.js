import jwt from 'jsonwebtoken';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.JWT_SECRET;
console.log('Using secret:', secret);

const token = jwt.sign(
  { id: 1, name: 'Arjun Mehta', email: 'arjun@vanguardarc.in', role: 'admin' },
  secret,
  { expiresIn: '30d' }
);

async function test() {
  try {
    const res = await fetch('http://127.0.0.1:5000/api/v1/contexts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Status:', res.status);
    const data = await res.text();
    console.log('Response:', data);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

test();
