export default function Timeline({ items = [], className = '' }) {
  return (
    <div className={`timeline ${className}`}>
      {items.map((item, i) => (
        <div key={item.id || i} className="timeline-item animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="timeline-marker">
            <div className={`timeline-dot ${item.dotColor || ''}`} />
            {i < items.length - 1 && <div className="timeline-line" />}
          </div>
          <div className="timeline-content">
            <h4>{item.title}</h4>
            {item.description && <p>{item.description}</p>}
            {item.time && <time>{item.time}</time>}
            {item.extra && <div style={{ marginTop: '4px' }}>{item.extra}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
