export default function StatusBadge({ status, size = 'sm', dot = false, className = '' }) {
  const colorMap = {
    healthy: 'success', active: 'success', normal: 'success', resolved: 'success',
    executed: 'success', success: 'success', up: 'success', completed: 'success',
    warning: 'warning', degraded: 'warning', monitoring: 'warning',
    pending: 'warning', scheduled: 'warning',
    critical: 'danger', failed: 'danger', high: 'danger', down: 'danger',
    maintenance: 'info', standby: 'info', investigating: 'info', info: 'info',
    low: 'success', medium: 'warning',
  };

  const badgeColor = colorMap[status?.toLowerCase()] || 'neutral';
  const label = status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span className={`badge badge-${badgeColor} ${dot ? 'badge-dot' : ''} ${className}`}>
      {label}
    </span>
  );
}
