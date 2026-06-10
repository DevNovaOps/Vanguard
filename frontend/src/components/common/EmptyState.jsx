import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'No data', message = '', action, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      <Icon size={48} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
}
