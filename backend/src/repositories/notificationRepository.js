import { getPool } from '../config/database.js';

const normalizeNotification = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    notificationId: row.notification_id,
    title: row.title,
    message: row.message,
    type: row.type,
    severity: row.severity,
    module: row.module,
    recipientRoles: row.recipient_roles || [],
    metadata: row.metadata || {},
    isRead: !!row.is_read,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const notificationRepository = {
  async create(data) {
    const pool = getPool();
    const [countResult] = await pool.execute('SELECT COUNT(*) as cnt FROM notifications');
    const notificationId = `NTF-${String(countResult[0].cnt + 1).padStart(6, '0')}`;

    const [result] = await pool.execute(
      `INSERT INTO notifications (notification_id, title, message, type, severity, module, recipient_roles, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notificationId, data.title, data.message, data.type, data.severity,
        data.module, JSON.stringify(data.recipientRoles || []),
        JSON.stringify(data.metadata || {})
      ]
    );

    // Add recipients if provided
    if (data.recipients && data.recipients.length > 0) {
      for (const userId of data.recipients) {
        await pool.execute(
          'INSERT IGNORE INTO notification_recipients (notification_id, user_id) VALUES (?, ?)',
          [result.insertId, userId]
        );
      }
    }

    return this.findById(result.insertId);
  },

  async findById(id) {
    const pool = getPool();
    const numId = parseInt(id, 10);
    let rows;
    if (!isNaN(numId) && String(numId) === String(id)) {
      [rows] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [numId]);
    } else {
      [rows] = await pool.execute('SELECT * FROM notifications WHERE notification_id = ?', [id]);
    }
    return normalizeNotification(rows[0]);
  },

  async findForUser(user, filters = {}) {
    const pool = getPool();
    const userId = parseInt(user._id, 10);
    const role = user.role;
    const { page = 1, limit = 50, type, severity, module, isRead } = filters;

    const conditions = [
      `(JSON_CONTAINS(n.recipient_roles, ?, '$') OR JSON_LENGTH(n.recipient_roles) = 0 OR nr.user_id = ?)`
    ];
    const values = [JSON.stringify(role), userId];

    if (type) { conditions.push('n.type = ?'); values.push(type); }
    if (severity) { conditions.push('n.severity = ?'); values.push(severity); }
    if (module) { conditions.push('n.module = ?'); values.push(module); }

    let readJoin = '';
    if (isRead === 'true' || isRead === true) {
      readJoin = `INNER JOIN notification_reads nrd ON n.id = nrd.notification_id AND nrd.user_id = ${userId}`;
    } else if (isRead === 'false' || isRead === false) {
      readJoin = `LEFT JOIN notification_reads nrd ON n.id = nrd.notification_id AND nrd.user_id = ${userId}`;
      conditions.push('nrd.id IS NULL');
    } else {
      readJoin = `LEFT JOIN notification_reads nrd ON n.id = nrd.notification_id AND nrd.user_id = ${userId}`;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    const [countResult] = await pool.execute(
      `SELECT COUNT(DISTINCT n.id) as cnt
       FROM notifications n
       LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
       ${readJoin}
       ${where}`,
      values
    );
    const total = countResult[0].cnt;

    const [rows] = await pool.execute(
      `SELECT DISTINCT n.*, IF(nrd2.id IS NOT NULL, 1, 0) as is_read
       FROM notifications n
       LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
       ${readJoin}
       LEFT JOIN notification_reads nrd2 ON n.id = nrd2.notification_id AND nrd2.user_id = ?
       ${where}
       ORDER BY n.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId, ...values]
    );

    return {
      notifications: rows.map(normalizeNotification),
      pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / parseInt(limit, 10)) }
    };
  },

  async findUnreadForUser(user) {
    const pool = getPool();
    const userId = parseInt(user._id, 10);
    const role = user.role;

    const [rows] = await pool.execute(
      `SELECT DISTINCT n.*, 0 as is_read
       FROM notifications n
       LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
       LEFT JOIN notification_reads nrd ON n.id = nrd.notification_id AND nrd.user_id = ?
       WHERE nrd.id IS NULL
         AND (JSON_CONTAINS(n.recipient_roles, ?, '$') OR JSON_LENGTH(n.recipient_roles) = 0 OR nr.user_id = ?)
       ORDER BY n.created_at DESC`,
      [userId, JSON.stringify(role), userId]
    );
    return rows.map(normalizeNotification);
  },

  async markAsRead(notificationId, userId) {
    const pool = getPool();
    const numNotifId = parseInt(notificationId, 10);
    const numUserId = parseInt(userId, 10);

    await pool.execute(
      'INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)',
      [numNotifId, numUserId]
    );
  },

  async markAllAsRead(user) {
    const pool = getPool();
    const userId = parseInt(user._id, 10);
    const role = user.role;

    // Get all unread notification IDs for this user
    const [unread] = await pool.execute(
      `SELECT DISTINCT n.id
       FROM notifications n
       LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
       LEFT JOIN notification_reads nrd ON n.id = nrd.notification_id AND nrd.user_id = ?
       WHERE nrd.id IS NULL
         AND (JSON_CONTAINS(n.recipient_roles, ?, '$') OR JSON_LENGTH(n.recipient_roles) = 0 OR nr.user_id = ?)`,
      [userId, JSON.stringify(role), userId]
    );

    let count = 0;
    for (const row of unread) {
      await pool.execute(
        'INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)',
        [row.id, userId]
      );
      count++;
    }
    return count;
  },

  async deleteById(id) {
    const pool = getPool();
    const notification = await this.findById(id);
    if (!notification) return null;
    const numId = parseInt(notification._id, 10);
    await pool.execute('DELETE FROM notifications WHERE id = ?', [numId]);
    return notification;
  },

  async getStatsForUser(user) {
    const pool = getPool();
    const userId = parseInt(user._id, 10);
    const role = user.role;

    const [total] = await pool.execute(
      `SELECT COUNT(DISTINCT n.id) as cnt
       FROM notifications n
       LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
       WHERE (JSON_CONTAINS(n.recipient_roles, ?, '$') OR JSON_LENGTH(n.recipient_roles) = 0 OR nr.user_id = ?)`,
      [JSON.stringify(role), userId]
    );

    const [unread] = await pool.execute(
      `SELECT COUNT(DISTINCT n.id) as cnt
       FROM notifications n
       LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
       LEFT JOIN notification_reads nrd ON n.id = nrd.notification_id AND nrd.user_id = ?
       WHERE nrd.id IS NULL
         AND (JSON_CONTAINS(n.recipient_roles, ?, '$') OR JSON_LENGTH(n.recipient_roles) = 0 OR nr.user_id = ?)`,
      [userId, JSON.stringify(role), userId]
    );

    return {
      total: total[0].cnt,
      unread: unread[0].cnt,
      read: total[0].cnt - unread[0].cnt
    };
  }
};

export default notificationRepository;
