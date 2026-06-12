export default function StatusBadge({ status, size = 'sm', dot = false, className = '' }) {
  const colorMap = {
    healthy: 'success', active: 'success', normal: 'success', resolved: 'success',
    executed: 'success', success: 'success', up: 'success', completed: 'success',
    warning: 'warning', degraded: 'warning', monitoring: 'warning',
    pending: 'warning', scheduled: 'warning',
    critical: 'danger', failed: 'danger', high: 'danger', down: 'danger',
    maintenance: 'info', standby: 'info', investigating: 'info', info: 'info',
    low: 'success', medium: 'warning', running: 'info',
  };

  const badgeColor = colorMap[status?.toLowerCase()] || 'neutral';
  const label = status?.replace(/_/g, ' ') || 'Unknown';
  const isHighAlert = ['critical', 'failed', 'high', 'down', 'warning', 'degraded'].includes(status?.toLowerCase());

  return (
    <span className={`badge badge-${badgeColor} ${dot ? 'badge-dot' : ''} ${className}`} style={{ position: 'relative' }}>
      {dot && isHighAlert && (
        <span style={{
          position: 'absolute',
          left: '11px',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          color: badgeColor === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)'
        }}>
          <span className="pulsing-ring" style={{ width: '100%', height: '100%' }} />
          <span className="pulsing-ring" style={{ width: '100%', height: '100%', animationDelay: '1s' }} />
        </span>
      )}
      {label}
    </span>
  );
}

