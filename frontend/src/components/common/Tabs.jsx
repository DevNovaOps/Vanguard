import { motion } from 'framer-motion';

export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`tabs ${className}`} style={{ position: 'relative' }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            className={`tab ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
            style={{ position: 'relative', borderBottomColor: 'transparent' }}
          >
            {tab.icon && <span style={{ marginRight: '6px', display: 'inline-flex', position: 'relative', zIndex: 1 }}>{tab.icon}</span>}
            <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
            {tab.count != null && (
              <span className="badge badge-neutral" style={{ marginLeft: '6px', position: 'relative', zIndex: 1 }}>{tab.count}</span>
            )}
            {isActive && (
              <motion.div
                className="active-tab-indicator"
                layoutId="activeTabUnderline"
                style={{
                  position: 'absolute',
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: 'var(--color-primary-500)',
                  zIndex: 0
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

