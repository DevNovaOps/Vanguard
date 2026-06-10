export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`tabs ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span style={{ marginRight: '6px', display: 'inline-flex' }}>{tab.icon}</span>}
          {tab.label}
          {tab.count != null && (
            <span className="badge badge-neutral" style={{ marginLeft: '6px' }}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
