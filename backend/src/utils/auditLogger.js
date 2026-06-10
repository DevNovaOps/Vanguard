import AuditLog from '../models/AuditLog.js';

/**
 * Creates an audit log entry.
 * Runs asynchronously and catches its own errors so audit failures don't disrupt core operations.
 */
export const logAudit = async ({ req, userId, module, action, description, metadata }) => {
  try {
    let resolvedUserId = userId;
    let ipAddress = null;

    if (req) {
      if (!resolvedUserId && req.user) {
        resolvedUserId = req.user._id;
      }
      ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    }

    await AuditLog.create({
      userId: resolvedUserId,
      module,
      action,
      description,
      ipAddress,
      metadata: metadata || {}
    });
  } catch (error) {
    console.error(`[AUDIT-LOG-ERROR] Failed to record audit log: ${error.message}`);
  }
};

export default logAudit;
