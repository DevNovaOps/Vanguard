import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: (delay) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: delay * 0.001,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1]
    }
  }),
  hover: {
    y: -6,
    scale: 1.015,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
};

const iconVariants = {
  hover: {
    scale: 1.15,
    rotate: [0, -5, 5, 0],
    transition: { duration: 0.4, ease: 'easeInOut' }
  }
};

export default function KPICard({ label, value, trend, trendDir, color = 'blue', icon, className = '', delay = 0 }) {
  const numericValue = typeof value === 'number' ? value : null;
  const animated = useAnimatedCounter(numericValue ?? 0, 1200);
  const IconComponent = Icons[icon] || Icons.Activity;

  return (
    <motion.div
      className={`kpi-card kpi-${color} ${className}`}
      variants={cardVariants}
      custom={delay}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap={{ scale: 0.99 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <motion.div className={`kpi-icon ${color}`} variants={iconVariants}>
          <IconComponent size={20} />
        </motion.div>
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


