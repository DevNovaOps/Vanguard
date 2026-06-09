import { motion } from 'framer-motion';
import { BarChart3, Database, Shield, AlertCircle, AlertTriangle, Bot, Download, FileSpreadsheet, FileText } from 'lucide-react';

const REPORTS = [
  { id: 1, title: 'Infrastructure Report', desc: 'Complete asset inventory with maintenance history, sensor health, and capacity utilization across all transit nodes.', icon: Database, color: 'var(--color-primary-500)', lastGenerated: '2 hours ago' },
  { id: 2, title: 'Compliance Report', desc: 'Regulatory compliance analysis against API617, RDSO, IEC, and UIC standards with violation summaries.', icon: Shield, color: 'var(--color-success)', lastGenerated: '1 day ago' },
  { id: 3, title: 'Incident Report', desc: 'Incident analysis with severity distribution, response times, resolution rates, and root cause breakdown.', icon: AlertCircle, color: 'var(--color-danger)', lastGenerated: '4 hours ago' },
  { id: 4, title: 'Risk Analysis Report', desc: 'Comprehensive risk assessment with failure predictions, threat matrices, and trending risk indicators.', icon: AlertTriangle, color: 'var(--color-warning)', lastGenerated: '6 hours ago' },
  { id: 5, title: 'Autonomous Actions Report', desc: 'AI agent decision log with confidence scores, execution times, success rates, and mitigation outcomes.', icon: Bot, color: 'var(--color-accent-500)', lastGenerated: '3 hours ago' },
];

export default function Reports() {
  const handleExport = (format, report) => {
    // Simulated export
    alert(`Exporting "${report.title}" as ${format.toUpperCase()}...`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><BarChart3 size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Reports</h1>
          <p>Generate and export platform reports</p>
        </div>
      </div>

      <div className="reports-grid">
        {REPORTS.map((report, i) => (
          <motion.div
            key={report.id}
            className="report-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <div className="report-card-icon" style={{ background: `${report.color}15`, color: report.color }}>
              <report.icon size={24} />
            </div>
            <h3>{report.title}</h3>
            <p>{report.desc}</p>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
              Last generated: {report.lastGenerated}
            </div>
            <div className="report-card-actions">
              <motion.button className="btn btn-primary btn-sm" onClick={() => handleExport('pdf', report)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Download size={12} /> PDF
              </motion.button>
              <motion.button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv', report)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <FileText size={12} /> CSV
              </motion.button>
              <motion.button className="btn btn-secondary btn-sm" onClick={() => handleExport('excel', report)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <FileSpreadsheet size={12} /> Excel
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
