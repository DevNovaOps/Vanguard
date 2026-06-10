import { motion } from 'framer-motion';

export default function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <motion.div
      className={`chart-card ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {(title || subtitle) && (
        <div className="chart-card-header">
          <div>
            <h3>{title}</h3>
            {subtitle && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </motion.div>
  );
}
