import { getPool } from '../config/database.js';

const normalizeWebhook = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    webhookId: row.webhook_id,
    name: row.name,
    description: row.description,
    endpoint: row.endpoint,
    method: row.method,
    headers: row.headers || {},
    subscribedEvents: row.subscribed_events || [],
    isActive: !!row.is_active,
    status: row.status,
    totalRequests: row.total_requests,
    successfulRequests: row.successful_requests,
    failedRequests: row.failed_requests,
    successRate: Number(row.success_rate),
    averageLatency: Number(row.average_latency),
    lastTriggeredAt: row.last_triggered_at,
    lastResponseCode: row.last_response_code,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // toJSON compatibility
    toJSON() { return this; }
  };
};

const normalizeDelivery = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    deliveryId: row.delivery_id,
    webhookId: row.webhook_id,
    eventType: row.event_type,
    payload: row.payload || {},
    responseCode: row.response_code,
    responseBody: row.response_body,
    latency: row.latency,
    status: row.status,
    retryCount: row.retry_count,
    timestamp: row.timestamp,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const webhookRepository = {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM webhooks ORDER BY created_at DESC');
    return rows.map(normalizeWebhook);
  },

  async findById(id) {
    const pool = getPool();
    // Try numeric ID, then webhook_id
    const numId = parseInt(id, 10);
    let rows;
    if (!isNaN(numId) && String(numId) === String(id)) {
      [rows] = await pool.execute('SELECT * FROM webhooks WHERE id = ?', [numId]);
    } else {
      [rows] = await pool.execute('SELECT * FROM webhooks WHERE webhook_id = ?', [id]);
    }
    return normalizeWebhook(rows[0]);
  },

  async findByWebhookId(webhookId) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM webhooks WHERE webhook_id = ?', [webhookId]);
    return normalizeWebhook(rows[0]);
  },

  async findActiveByEvent(eventType) {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM webhooks WHERE is_active = 1 AND JSON_CONTAINS(subscribed_events, ?, '$')",
      [JSON.stringify(eventType)]
    );
    return rows.map(normalizeWebhook);
  },

  async create(data) {
    const pool = getPool();
    const [countResult] = await pool.execute('SELECT COUNT(*) as cnt FROM webhooks');
    const webhookId = `WH-${String(countResult[0].cnt + 1).padStart(4, '0')}`;

    const [result] = await pool.execute(
      `INSERT INTO webhooks (webhook_id, name, description, endpoint, method, headers, subscribed_events, is_active, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        webhookId, data.name, data.description || '', data.endpoint, data.method || 'POST',
        JSON.stringify(data.headers || {}), JSON.stringify(data.subscribedEvents || []),
        data.isActive !== false ? 1 : 0, 'Active', data.createdBy || null
      ]
    );
    return this.findById(result.insertId);
  },

  async update(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.endpoint !== undefined) { fields.push('endpoint = ?'); values.push(updates.endpoint); }
    if (updates.method !== undefined) { fields.push('method = ?'); values.push(updates.method); }
    if (updates.headers !== undefined) { fields.push('headers = ?'); values.push(JSON.stringify(updates.headers)); }
    if (updates.subscribedEvents !== undefined) { fields.push('subscribed_events = ?'); values.push(JSON.stringify(updates.subscribedEvents)); }
    if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.totalRequests !== undefined) { fields.push('total_requests = ?'); values.push(updates.totalRequests); }
    if (updates.successfulRequests !== undefined) { fields.push('successful_requests = ?'); values.push(updates.successfulRequests); }
    if (updates.failedRequests !== undefined) { fields.push('failed_requests = ?'); values.push(updates.failedRequests); }
    if (updates.successRate !== undefined) { fields.push('success_rate = ?'); values.push(updates.successRate); }
    if (updates.averageLatency !== undefined) { fields.push('average_latency = ?'); values.push(updates.averageLatency); }
    if (updates.lastTriggeredAt !== undefined) { fields.push('last_triggered_at = ?'); values.push(updates.lastTriggeredAt); }
    if (updates.lastResponseCode !== undefined) { fields.push('last_response_code = ?'); values.push(updates.lastResponseCode); }

    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.execute(`UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async deleteById(id) {
    const pool = getPool();
    const webhook = await this.findById(id);
    if (!webhook) return null;
    const numId = parseInt(webhook._id, 10);
    await pool.execute('DELETE FROM webhooks WHERE id = ?', [numId]);
    return webhook;
  },

  async incrementStats(id, success, latency, responseCode) {
    const pool = getPool();
    const numId = parseInt(id, 10);
    if (success) {
      await pool.execute(
        `UPDATE webhooks SET
           total_requests = total_requests + 1,
           successful_requests = successful_requests + 1,
           success_rate = ROUND((successful_requests + 1) / (total_requests + 1) * 100, 2),
           average_latency = ROUND(((average_latency * total_requests) + ?) / (total_requests + 1), 2),
           last_triggered_at = NOW(),
           last_response_code = ?
         WHERE id = ?`,
        [latency, responseCode, numId]
      );
    } else {
      await pool.execute(
        `UPDATE webhooks SET
           total_requests = total_requests + 1,
           failed_requests = failed_requests + 1,
           success_rate = ROUND(successful_requests / (total_requests + 1) * 100, 2),
           last_triggered_at = NOW(),
           last_response_code = ?
         WHERE id = ?`,
        [responseCode, numId]
      );
    }
  },

  async getStatistics() {
    const pool = getPool();
    const [total] = await pool.execute('SELECT COUNT(*) as cnt FROM webhooks');
    const [active] = await pool.execute('SELECT COUNT(*) as cnt FROM webhooks WHERE is_active = 1');
    const [avgLatency] = await pool.execute('SELECT AVG(average_latency) as avg_lat FROM webhooks');
    const [avgSuccessRate] = await pool.execute('SELECT AVG(success_rate) as avg_sr FROM webhooks');

    return {
      totalWebhooks: total[0].cnt,
      activeWebhooks: active[0].cnt,
      averageLatency: Math.round((avgLatency[0].avg_lat || 0) * 100) / 100,
      successRate: Math.round((avgSuccessRate[0].avg_sr || 100) * 100) / 100
    };
  },

  // ─── Deliveries ──────────────────────────────────────────────────────
  async createDelivery(data) {
    const pool = getPool();
    const deliveryId = `DEL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const [result] = await pool.execute(
      `INSERT INTO webhook_deliveries (delivery_id, webhook_id, event_type, payload, response_code, response_body, latency, status, retry_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deliveryId, data.webhookId, data.eventType, JSON.stringify(data.payload || {}),
        data.responseCode || null, data.responseBody || '', data.latency || 0,
        data.status, data.retryCount || 0
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM webhook_deliveries WHERE id = ?', [result.insertId]);
    return normalizeDelivery(rows[0]);
  },

  async findDeliveries(filters = {}) {
    const pool = getPool();
    const conditions = [];
    const values = [];

    if (filters.webhookId) { conditions.push('webhook_id = ?'); values.push(filters.webhookId); }
    if (filters.status) { conditions.push('status = ?'); values.push(filters.status); }
    if (filters.eventType) { conditions.push('event_type = ?'); values.push(filters.eventType); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT * FROM webhook_deliveries ${where} ORDER BY timestamp DESC LIMIT 100`,
      values
    );
    return rows.map(normalizeDelivery);
  },

  async findDeliveryById(id) {
    const pool = getPool();
    const numId = parseInt(id, 10);
    let rows;
    if (!isNaN(numId) && String(numId) === String(id)) {
      [rows] = await pool.execute('SELECT * FROM webhook_deliveries WHERE id = ?', [numId]);
    } else {
      [rows] = await pool.execute('SELECT * FROM webhook_deliveries WHERE delivery_id = ?', [id]);
    }
    return normalizeDelivery(rows[0]);
  },

  async updateDelivery(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.responseCode !== undefined) { fields.push('response_code = ?'); values.push(updates.responseCode); }
    if (updates.responseBody !== undefined) { fields.push('response_body = ?'); values.push(updates.responseBody); }
    if (updates.latency !== undefined) { fields.push('latency = ?'); values.push(updates.latency); }
    if (updates.retryCount !== undefined) { fields.push('retry_count = ?'); values.push(updates.retryCount); }

    if (fields.length === 0) return;
    values.push(id);
    await pool.execute(`UPDATE webhook_deliveries SET ${fields.join(', ')} WHERE id = ?`, values);
  }
};

export default webhookRepository;
