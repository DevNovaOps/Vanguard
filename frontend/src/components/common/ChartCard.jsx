import { motion } from 'framer-motion';

const chartVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
  },
  hover: {
    y: -4,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
};

export default function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <motion.div
      className={`chart-card ${className}`}
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
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

