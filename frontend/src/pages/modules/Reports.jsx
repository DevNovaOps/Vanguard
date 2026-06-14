import { motion } from 'framer-motion';
import { BarChart3, Database, Shield, AlertCircle, AlertTriangle, Bot, Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { useSimulation } from '../../contexts/SimulationContext';
import { useAuth } from '../../contexts/AuthContext';
import { downloadReport } from '../../utils/reportService';

const REPORTS = [
  { id: 1, title: 'Infrastructure Report', desc: 'Complete asset inventory with maintenance history, sensor health, and capacity utilization across all transit nodes.', icon: Database, color: 'var(--color-primary-500)', lastGenerated: '2 hours ago' },
  { id: 2, title: 'Compliance Report', desc: 'Regulatory compliance analysis against API617, RDSO, IEC, and UIC standards with violation summaries.', icon: Shield, color: 'var(--color-success)', lastGenerated: '1 day ago' },
  { id: 3, title: 'Incident Report', desc: 'Incident analysis with severity distribution, response times, resolution rates, and root cause breakdown.', icon: AlertCircle, color: 'var(--color-danger)', lastGenerated: '4 hours ago' },
  { id: 4, title: 'Risk Analysis Report', desc: 'Comprehensive risk assessment with failure predictions, threat matrices, and trending risk indicators.', icon: AlertTriangle, color: 'var(--color-warning)', lastGenerated: '6 hours ago' },
  { id: 5, title: 'Autonomous Actions Report', desc: 'AI agent decision log with confidence scores, execution times, success rates, and mitigation outcomes.', icon: Bot, color: 'var(--color-accent-500)', lastGenerated: '3 hours ago' },
];

export default function Reports() {
  const { simulationStore } = useSimulation();
  const { user } = useAuth();
  const userRole = user?.role;

  const allowedReports = REPORTS.filter(report => {
    if (userRole === 'admin') return true;

    // Compliance Report, Risk Analysis Report, Autonomous Actions Report: NOT allowed for Operator
    if (
      report.title === 'Compliance Report' ||
      report.title === 'Risk Analysis Report' ||
      report.title === 'Autonomous Actions Report'
    ) {
      return userRole === 'safety_officer' || userRole === 'manager';
    }

    return true;
  });

  const handleExport = async (format, report) => {
    const endpointMap = {
      'Infrastructure Report': 'infrastructure',
      'Compliance Report': 'compliance',
      'Incident Report': 'incidents',
      'Risk Analysis Report': 'risk',
      'Autonomous Actions Report': 'agent'
    };
    const key = endpointMap[report.title];
    if (!key) return;

    try {
      await downloadReport(key, format, report.title);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  const exportSimulatedJSON = () => {
    if (!simulationStore) return;
    const blob = new Blob([JSON.stringify(simulationStore, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard_failure_simulation_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportSimulatedPDF = () => {
    if (!simulationStore) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Vanguard ARC Simulation Diagnostic Report</title>
          <style>
            body { font-family: sans-serif; padding: 2.5rem; color: #1e293b; line-height: 1.6; max-width: 900px; margin: 0 auto; }
            h1 { color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
            h2 { color: #1d4ed8; margin-top: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; font-size: 1.25rem; }
            pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 8px; white-space: pre-wrap; word-break: break-all; font-family: monospace; font-size: 13px; color: #334155; }
            .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem; background: #f1f5f9; padding: 1.25rem; border-radius: 8px; }
            .meta-item { font-size: 14px; }
            .meta-label { font-weight: bold; color: #475569; }
          </style>
        </head>
        <body>
          <h1>Vanguard Failure Simulation Diagnostic Report</h1>
          <div class="meta">
            <div class="meta-item"><span class="meta-label">Asset:</span> Transformer S-011 (Transformer)</div>
            <div class="meta-item"><span class="meta-label">Location:</span> Bhusawal Power Hub</div>
            <div class="meta-item"><span class="meta-label">Failure Type:</span> Bearing Overheating</div>
            <div class="meta-item"><span class="meta-label">Risk Level:</span> ${simulationStore.risk_level}</div>
            <div class="meta-item"><span class="meta-label">Generated At:</span> ${new Date().toLocaleString()}</div>
          </div>
          
          <h2>1. Executive Summary</h2>
          <pre>${simulationStore.executive_summary}</pre>
          
          <h2>2. Sensor Evidence</h2>
          <pre>${simulationStore.sensor_evidence}</pre>
          
          <h2>3. Historical Incidents</h2>
          <pre>${simulationStore.historical_incidents}</pre>
          
          <h2>4. RDSO Guidance & Standards</h2>
          <pre>${simulationStore.rdso_guidance}</pre>
          
          <h2>5. Diagnosed Root Causes</h2>
          <pre>${simulationStore.root_causes}</pre>
          
          <h2>6. Recommended Mitigation Actions</h2>
          <pre>${simulationStore.mitigation_actions}</pre>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><BarChart3 size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /><span className="gradient-text">Reports</span></h1>
          <p>Generate and export platform reports</p>
        </div>
      </div>

      {simulationStore && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--color-danger)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle style={{ color: '#ef4444' }} /> Simulated Failure Diagnostic Report (S-011)
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Full diagnostic summary from the 7-agent pipeline run
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary btn-sm" onClick={exportSimulatedPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={12} /> Export PDF
              </button>
              <button className="btn btn-secondary btn-sm" onClick={exportSimulatedJSON} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileJson size={12} /> Export JSON
              </button>
            </div>
          </div>
          <div style={{ maxHeight: '350px', overflowY: 'auto', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
            {simulationStore.executive_summary}
          </div>
        </motion.div>
      )}

      <div className="reports-grid">
        {allowedReports.map((report, i) => (
          <motion.div
            key={report.id}
            className="card report-card"
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
