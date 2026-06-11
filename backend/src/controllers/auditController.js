import auditService from '../services/auditService.js';
import AuditLog from '../models/AuditLog.js';

export const getAuditLogsController = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);
    res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogByIdController = async (req, res, next) => {
  try {
    const log = await AuditLog.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { auditId: req.params.id }
      ]
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: `Audit log with ID ${req.params.id} not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Audit log retrieved successfully',
      data: log
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditStatsController = async (req, res, next) => {
  try {
    const stats = await auditService.getAuditStatistics();
    res.status(200).json({
      success: true,
      message: 'Audit statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogsByModuleController = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs({
      ...req.query,
      module: req.params.module
    });
    res.status(200).json({
      success: true,
      message: `Audit logs for module ${req.params.module} retrieved successfully`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogsBySeverityController = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs({
      ...req.query,
      severity: req.params.severity
    });
    res.status(200).json({
      success: true,
      message: `Audit logs with severity ${req.params.severity} retrieved successfully`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const exportAuditLogsController = async (req, res, next) => {
  try {
    const logs = await auditService.exportAuditLogs(req.query);

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');

      let csv = 'Audit ID,Timestamp,Module,Action,User,Role,Severity,Description,IP Address\n';
      logs.forEach(log => {
        const date = log.timestamp || log.createdAt;
        const formattedDate = date ? new Date(date).toISOString() : '';
        const user = log.username || 'System';
        const role = log.role || 'System';
        const desc = (log.description || '').replace(/"/g, '""');
        const ip = log.ipAddress || '';
        csv += `"${log.auditId}","${formattedDate}","${log.module}","${log.action}","${user}","${role}","${log.severity}","${desc}","${ip}"\n`;
      });
      return res.status(200).send(csv);
    }

    res.status(200).json({
      success: true,
      message: 'Audit logs exported successfully',
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
