import { getPool } from '../config/database.js';
import bcrypt from 'bcryptjs';

/**
 * Normalizes a user row from MySQL to the API response format.
 * Maps `id` → `_id` (string) for frontend compatibility.
 */
const normalizeUser = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    permissions: row.permissions || [],
    department: row.department,
    isActive: !!row.is_active,
    phone: row.phone,
    lastLogin: row.last_login,
    resetPasswordToken: row.reset_password_token,
    resetPasswordExpire: row.reset_password_expire,
    loginOTP: row.login_otp,
    loginOTPExpire: row.login_otp_expire,
    otpAttempts: row.otp_attempts,
    otpLockedUntil: row.otp_locked_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Method to compare passwords
    comparePassword: async (candidatePassword) => {
      return bcrypt.compare(candidatePassword, row.password);
    }
  };
};

const userRepository = {
  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return normalizeUser(rows[0]);
  },

  async findByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    return normalizeUser(rows[0]);
  },

  async findByResetToken(hashedToken) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expire > NOW()',
      [hashedToken]
    );
    return normalizeUser(rows[0]);
  },

  async create({ name, email, password, role, department, permissions }) {
    const pool = getPool();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const permsJson = JSON.stringify(permissions || []);

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password, role, department, permissions, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, department || 'General Operations', permsJson, 0]
    );

    return this.findById(result.insertId);
  },

  async update(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.department !== undefined) { fields.push('department = ?'); values.push(updates.department); }
    if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }
    if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(updates.permissions)); }
    if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone); }
    if (updates.lastLogin !== undefined) { fields.push('last_login = ?'); values.push(updates.lastLogin); }
    if (updates.resetPasswordToken !== undefined) { fields.push('reset_password_token = ?'); values.push(updates.resetPasswordToken); }
    if (updates.resetPasswordExpire !== undefined) { fields.push('reset_password_expire = ?'); values.push(updates.resetPasswordExpire); }
    if (updates.loginOTP !== undefined) { fields.push('login_otp = ?'); values.push(updates.loginOTP); }
    if (updates.loginOTPExpire !== undefined) { fields.push('login_otp_expire = ?'); values.push(updates.loginOTPExpire); }
    if (updates.otpAttempts !== undefined) { fields.push('otp_attempts = ?'); values.push(updates.otpAttempts); }
    if (updates.otpLockedUntil !== undefined) { fields.push('otp_locked_until = ?'); values.push(updates.otpLockedUntil); }

    // Handle password update (hash it)
    if (updates.password !== undefined) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(updates.password, salt);
      fields.push('password = ?');
      values.push(hashedPassword);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async deleteById(id) {
    const pool = getPool();
    const user = await this.findById(id);
    if (!user) return null;
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    return user;
  },

  async findAllExcept(email) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, permissions, department, is_active, phone, last_login, created_at, updated_at FROM users WHERE email != ?',
      [email]
    );
    return rows.map(normalizeUser);
  },

  async approveAll() {
    const pool = getPool();
    const [result] = await pool.execute('UPDATE users SET is_active = 1 WHERE is_active = 0');
    return { modifiedCount: result.affectedRows };
  },

  async countAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM users');
    return rows[0].cnt;
  },

  async countActive() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1');
    return rows[0].cnt;
  }
};

export default userRepository;
