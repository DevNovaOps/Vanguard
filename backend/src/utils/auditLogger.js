import auditService from '../services/auditService.js';

/**
   * Bridge existing logAudit calls to the new auditService
   */
export const logAudit = async ({ req, userId, module, action, description, metadata, severity }) => {
  let resolvedSeverity = severity;

  if (!resolvedSeverity) {
    const act = (action || '').toLowerCase();
    const desc = (description || '').toLowerCase();

    if (
      act.includes('violation') ||
      act.includes('breach') ||
      act.includes('critical') ||
      desc.includes('critical') ||
      desc.includes('violation')
    ) {
      resolvedSeverity = 'Critical';
    } else if (
      act.includes('warn') ||
      act.includes('escalat') ||
      act.includes('fail') ||
      desc.includes('warn') ||
      desc.includes('fail')
    ) {
      resolvedSeverity = 'Warning';
    } else {
      resolvedSeverity = 'Info';
    }
  }

  return auditService.logEvent({
    req,
    userId,
    module,
    action,
    description,
    metadata,
    severity: resolvedSeverity
  });
};

export default logAudit;
