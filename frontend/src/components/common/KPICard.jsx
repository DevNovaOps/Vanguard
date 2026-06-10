import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function KPICard({ label, value, trend, trendDir, color = 'blue', icon, className = '', delay = 0 }) {
  const numericValue = typeof value === 'number' ? value : null;
  const animated = useAnimatedCounter(numericValue ?? 0, 1200);
  const IconComponent = Icons[icon] || Icons.Activity;

  return (
    <motion.div
      className={`kpi-card kpi-${color} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.001, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className={`kpi-icon ${color}`}>
          <IconComponent size={20} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {trend && (
            <span className={`kpi-trend ${trendDir === 'up' ? 'up' : 'down'}`}>
              {trendDir === 'up' ? '↑' : '↓'} {trend}
            </span>
          )}
          <span className="live-indicator" style={{ fontSize: '0' }}>
            <span style={{ width: 5, height: 5 }} />
          </span>
        </div>
      </div>
      <div>
        <div className="kpi-value">{numericValue !== null ? animated.toLocaleString() : value}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </motion.div>
  );
}
