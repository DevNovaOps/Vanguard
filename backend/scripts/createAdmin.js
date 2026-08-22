import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { getPool } = await import('../src/config/database.js');

async function createAdmin() {
  const args = process.argv.slice(2);
  const getArg = (flag, defaultVal) => {
    const index = args.indexOf(flag);
    return index !== -1 && args[index + 1] ? args[index + 1] : defaultVal;
  };

  const name = getArg('--name', 'Vanguard Admin');
  const email = getArg('--email', 'admin@vanguard.com');
  const rawPassword = getArg('--password', 'Admin@12345');
  const department = getArg('--department', 'Executive Management');

  try {
    const pool = getPool();

    // Check if user already exists
    const [existing] = await pool.execute('SELECT id, role, is_active FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPassword, salt);
      const permissions = JSON.stringify([
        'dashboard', 'railway-network', 'telemetry', 'infrastructure',
        'risk-analysis', 'compliance', 'incidents', 'autonomous-agent',
        'mitigation', 'audit-logs', 'webhooks', 'reports', 'settings'
      ]);

      await pool.execute(
        `UPDATE users SET name = ?, password = ?, role = 'Admin', department = ?, permissions = ?, is_active = 1 WHERE email = ?`,
        [name, hashedPassword, department, permissions, email]
      );

      console.log(`\n✓ Existing user updated to Admin:`);
      console.log(`  - Name: ${name}`);
      console.log(`  - Email: ${email}`);
      console.log(`  - Password: ${rawPassword}`);
      console.log(`  - Role: Admin`);
      console.log(`  - Active: 1 (Enabled)\n`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);
    const permissions = JSON.stringify([
      'dashboard', 'railway-network', 'telemetry', 'infrastructure',
      'risk-analysis', 'compliance', 'incidents', 'autonomous-agent',
      'mitigation', 'audit-logs', 'webhooks', 'reports', 'settings'
    ]);

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password, role, department, permissions, is_active)
       VALUES (?, ?, ?, 'Admin', ?, ?, 1)`,
      [name, email, hashedPassword, department, permissions]
    );

    console.log(`\n✓ Admin user successfully created!`);
    console.log(`  - User ID: ${result.insertId}`);
    console.log(`  - Name: ${name}`);
    console.log(`  - Email: ${email}`);
    console.log(`  - Password: ${rawPassword}`);
    console.log(`  - Role: Admin`);
    console.log(`  - Active: 1 (Enabled)\n`);
  } catch (err) {
    console.error(`✗ Failed to create admin user: ${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

createAdmin();
