import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import reportService from '../services/reportService.js';
import auditService from '../services/auditService.js';

// Helper to draw headers on PDF
const drawPDFHeader = (doc, title) => {
  // Top Banner
  doc.rect(0, 0, 612, 100).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(16).text('VANGUARD ARC REPORTING SYSTEM', 50, 30);
  doc.fontSize(12).fillColor('#94a3b8').text(title.toUpperCase(), 50, 55);
  doc.fontSize(8).fillColor('#64748b').text(`GENERATED: ${new Date().toLocaleString()}`, 50, 75);
  doc.moveDown(4);
};

// Helper to draw footer on PDF
const drawPDFFooter = (doc) => {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, 740).lineTo(562, 740).stroke();
    doc.fillColor('#64748b').fontSize(8).text(
      `Vanguard Autonomous Recovery & Compliance Center | Page ${i + 1} of ${range.count}`,
      50,
      750,
      { align: 'center', width: 512 }
    );
  }
};

// Helper to draw KPI blocks
const drawPDFKPIs = (doc, sectionTitle, kpis, startY) => {
  doc.fontSize(11).fillColor('#0f172a').text(sectionTitle.toUpperCase(), 50, startY);
  const currentY = startY + 18;
  const count = kpis.length;
  const cardWidth = (512 - (count - 1) * 10) / count;

  kpis.forEach((kpi, idx) => {
    const startX = 50 + idx * (cardWidth + 10);
    // Draw card background
    doc.rect(startX, currentY, cardWidth, 45).fill('#f8fafc');
    doc.rect(startX, currentY, cardWidth, 45).strokeColor('#e2e8f0').lineWidth(0.8).stroke();
    // KPI Label
    doc.fillColor('#64748b').fontSize(7).text(kpi.label.toUpperCase(), startX + 8, currentY + 8, { width: cardWidth - 16 });
    // KPI Value
    doc.fillColor(kpi.color || '#0f172a').fontSize(12).text(kpi.value.toString(), startX + 8, currentY + 22, { width: cardWidth - 16 });
  });

  return currentY + 60;
};

// Helper to draw tables on PDF
const drawPDFTable = (doc, headers, rows, startY) => {
  const colCount = headers.length;
  const colWidth = 512 / colCount;
  let currentY = startY;

  // Header Row
  doc.rect(50, currentY, 512, 18).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(8);
  headers.forEach((h, idx) => {
    doc.text(h.toUpperCase(), 55 + idx * colWidth, currentY + 5, { width: colWidth - 10, align: 'left' });
  });
  currentY += 18;

  // Data Rows
  doc.fontSize(7).fillColor('#334155');
  if (rows.length === 0) {
    doc.rect(50, currentY, 512, 20).fill('#f8fafc');
    doc.fillColor('#64748b').text('No data available', 55, currentY + 6, { align: 'center', width: 502 });
    currentY += 20;
    return currentY + 10;
  }

  rows.forEach((row, rowIndex) => {
    const rowHeight = 18;
    // Alternate backgrounds
    if (rowIndex % 2 === 0) {
      doc.rect(50, currentY, 512, rowHeight).fill('#f8fafc');
    } else {
      doc.rect(50, currentY, 512, rowHeight).fill('#ffffff');
    }

    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, currentY + rowHeight).lineTo(562, currentY + rowHeight).stroke();
    doc.fillColor('#334155');

    row.forEach((cell, cellIndex) => {
      doc.text((cell ?? 'N/A').toString(), 55 + cellIndex * colWidth, currentY + 5, { width: colWidth - 10, align: 'left', lineBreak: false });
    });

    currentY += rowHeight;

    // Check page overflow
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
    }
  });

  return currentY + 10;
};

// Log report export to the audit system
const auditExport = async (req, reportType, format, moduleName) => {
  try {
    await auditService.logEvent({
      req,
      action: 'REPORT_GENERATED',
      module: moduleName,
      description: `${reportType} exported successfully in ${format.toUpperCase()} format`,
      severity: 'Info',
      metadata: {
        reportType,
        format,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error(`[REPORT-AUDIT-ERROR] Failed logging export audit: ${error.message}`);
  }
};

/**
 * Report Controllers
 */

// 1. INFRASTRUCTURE REPORTS
export const getInfrastructurePdf = async (req, res, next) => {
  try {
    const data = await reportService.getInfrastructureData();
    const doc = new PDFDocument({ margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Infrastructure_Report_${new Date().getFullYear()}.pdf"`);
    doc.pipe(res);

    drawPDFHeader(doc, 'Infrastructure & Asset Health Report');

    // Section: Availability & Summary
    let y = 120;
    const kpis = [
      { label: 'Total Nodes', value: data.assetHealth.total },
      { label: 'Healthy/Active Nodes', value: data.assetHealth.healthy, color: '#16a34a' },
      { label: 'Maintenance Nodes', value: data.assetHealth.maintenance, color: '#d97706' },
      { label: 'Node Availability', value: `${data.availability.nodes}%`, color: '#16a34a' },
      { label: 'Connection Availability', value: `${data.availability.connections}%`, color: '#16a34a' }
    ];
    y = drawPDFKPIs(doc, 'Platform Availability Indicators', kpis, y);

    // Section: Regional Breakdown
    doc.fontSize(11).fillColor('#0f172a').text('REGIONAL BREAKDOWN', 50, y);
    y += 18;
    const regionHeaders = ['Region', 'Total Nodes', 'Active', 'Maintenance', 'Inactive'];
    const regionRows = data.regionalBreakdown.map(r => [
      r.region, r.total, r.active, r.maintenance, r.inactive
    ]);
    y = drawPDFTable(doc, regionHeaders, regionRows, y);
    y += 10;

    // Section: Node Inventory
    doc.fontSize(11).fillColor('#0f172a').text('NODE INVENTORY', 50, y);
    y += 18;
    const nodeHeaders = ['Code', 'Node Name', 'Type', 'Region', 'Status', 'Coordinates'];
    const nodeRows = data.nodeInventory.map(n => [
      n.code, n.name, n.type, n.region, n.status, n.coordinates
    ]);
    y = drawPDFTable(doc, nodeHeaders, nodeRows, y);
    y += 10;

    // Section: Capacity Utilization
    doc.fontSize(11).fillColor('#0f172a').text(`CAPACITY UTILIZATION (AVG LOAD: ${data.capacity.averageLoad}%)`, 50, y);
    y += 18;
    const capHeaders = ['Connection Route', 'Distance (km)', 'Status', 'Load %'];
    const capRows = data.capacity.connectionLoads.map(c => [
      c.connection, `${c.distance} km`, c.status, `${c.load}%`
    ]);
    drawPDFTable(doc, capHeaders, capRows, y);

    drawPDFFooter(doc);
    
    // Log audit before finishing response stream
    await auditExport(req, 'Infrastructure Report', 'pdf', 'TransitNode');
    doc.end();
  } catch (error) {
    next(error);
  }
};

export const getInfrastructureCsv = async (req, res, next) => {
  try {
    const data = await reportService.getInfrastructureData();
    const records = data.nodeInventory.map(n => ({
      'Node Code': n.code,
      'Node Name': n.name,
      'Node Type': n.type,
      'Region': n.region,
      'Status': n.status,
      'Coordinates': n.coordinates
    }));

    const parser = new Parser();
    const csv = records.length > 0 ? parser.parse(records) : 'Node Code,Node Name,Node Type,Region,Status,Coordinates\nNo records available';

    await auditExport(req, 'Infrastructure Report', 'csv', 'TransitNode');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Infrastructure_Report_${new Date().getFullYear()}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const getInfrastructureExcel = async (req, res, next) => {
  try {
    const data = await reportService.getInfrastructureData();
    const workbook = new ExcelJS.Workbook();
    
    // Nodes Sheet
    const nodeSheet = workbook.addWorksheet('Node Inventory');
    nodeSheet.columns = [
      { header: 'Node Code', key: 'code', width: 15 },
      { header: 'Node Name', key: 'name', width: 25 },
      { header: 'Node Type', key: 'type', width: 15 },
      { header: 'Region', key: 'region', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Coordinates', key: 'coordinates', width: 25 }
    ];
    if (data.nodeInventory.length > 0) {
      data.nodeInventory.forEach(n => nodeSheet.addRow(n));
    } else {
      nodeSheet.addRow({ code: 'No records available' });
    }

    // Connections Sheet
    const connSheet = workbook.addWorksheet('Capacity & Connections');
    connSheet.columns = [
      { header: 'Connection Route', key: 'connection', width: 20 },
      { header: 'Distance (km)', key: 'distance', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Load %', key: 'load', width: 15 }
    ];
    if (data.capacity.connectionLoads.length > 0) {
      data.capacity.connectionLoads.forEach(c => connSheet.addRow(c));
    } else {
      connSheet.addRow({ connection: 'No records available' });
    }

    await auditExport(req, 'Infrastructure Report', 'excel', 'TransitNode');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Infrastructure_Report_${new Date().getFullYear()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};


// 2. COMPLIANCE REPORTS
export const getCompliancePdf = async (req, res, next) => {
  try {
    const data = await reportService.getComplianceData();
    const doc = new PDFDocument({ margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Compliance_Report_${new Date().getFullYear()}.pdf"`);
    doc.pipe(res);

    drawPDFHeader(doc, 'Regulatory Compliance Report');

    // Section: Score & Summary KPIs
    let y = 120;
    const kpis = [
      { label: 'Compliance Score', value: `${data.complianceScore}%`, color: data.complianceScore > 80 ? '#16a34a' : '#dc2626' },
      { label: 'Total Violations', value: data.violationsSummary.total },
      { label: 'Open Violations', value: data.violationsSummary.open, color: '#dc2626' },
      { label: 'Investigating', value: data.violationsSummary.investigating, color: '#d97706' },
      { label: 'Resolved Violations', value: data.violationsSummary.resolved, color: '#16a34a' }
    ];
    y = drawPDFKPIs(doc, 'Compliance Scorecard', kpis, y);

    // Section: Severity Distribution
    doc.fontSize(11).fillColor('#0f172a').text('SEVERITY DISTRIBUTION', 50, y);
    y += 18;
    const sevHeaders = ['Low Severity', 'Medium Severity', 'High Severity', 'Critical Severity'];
    const sevRows = [[
      data.severityDistribution.Low,
      data.severityDistribution.Medium,
      data.severityDistribution.High,
      data.severityDistribution.Critical
    ]];
    y = drawPDFTable(doc, sevHeaders, sevRows, y);
    y += 10;

    // Section: Standards Performance
    doc.fontSize(11).fillColor('#0f172a').text('STANDARDS SUMMARY', 50, y);
    y += 18;
    const stdHeaders = ['Standard Framework', 'Rules Configured', 'Active Violations', 'Total Violations Logged'];
    const stdRows = Object.keys(data.standardsBreakdown).map(std => [
      std,
      data.standardsBreakdown[std].rulesCount,
      data.standardsBreakdown[std].openViolations,
      data.standardsBreakdown[std].totalViolations
    ]);
    y = drawPDFTable(doc, stdHeaders, stdRows, y);
    y += 10;

    // Section: Recent Violations
    doc.fontSize(11).fillColor('#0f172a').text('RECENT BREACHES REGISTRY', 50, y);
    y += 18;
    const vHeaders = ['Rule Code', 'Standard', 'Transit Node', 'Reading', 'Limit', 'Severity', 'Status'];
    const vRows = data.recentViolations.slice(0, 15).map(v => [
      v.ruleCode, v.standard, `${v.nodeName} (${v.nodeCode})`, v.actualValue, v.expectedValue, v.severity, v.status
    ]);
    drawPDFTable(doc, vHeaders, vRows, y);

    drawPDFFooter(doc);
    
    await auditExport(req, 'Compliance Report', 'pdf', 'Compliance');
    doc.end();
  } catch (error) {
    next(error);
  }
};

export const getComplianceCsv = async (req, res, next) => {
  try {
    const data = await reportService.getComplianceData();
    const records = data.recentViolations.map(v => ({
      'Violation ID': v.id,
      'Rule Code': v.ruleCode,
      'Standard': v.standard,
      'Node Code': v.nodeCode,
      'Node Name': v.nodeName,
      'Sensor Type': v.sensorType,
      'Actual Value': v.actualValue,
      'Expected Value': v.expectedValue,
      'Severity': v.severity,
      'Status': v.status,
      'Detected Date': v.createdAt
    }));

    const parser = new Parser();
    const csv = records.length > 0 ? parser.parse(records) : 'Violation ID,Rule Code,Standard,Node Code,Node Name,Sensor Type,Actual Value,Expected Value,Severity,Status,Detected Date\nNo records available';

    await auditExport(req, 'Compliance Report', 'csv', 'Compliance');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Compliance_Report_${new Date().getFullYear()}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const getComplianceExcel = async (req, res, next) => {
  try {
    const data = await reportService.getComplianceData();
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Compliance Summary');
    summarySheet.addRow(['Compliance Score', `${data.complianceScore}%`]);
    summarySheet.addRow(['Total Rules', data.rulesPerformance.length]);
    summarySheet.addRow(['Total Violations', data.violationsSummary.total]);
    summarySheet.addRow(['Open Violations', data.violationsSummary.open]);
    summarySheet.addRow(['Investigating Violations', data.violationsSummary.investigating]);
    summarySheet.addRow(['Resolved Violations', data.violationsSummary.resolved]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Standard Framework', 'Rules Configured', 'Active Violations', 'Total Violations Logged']);
    Object.keys(data.standardsBreakdown).forEach(std => {
      summarySheet.addRow([
        std,
        data.standardsBreakdown[std].rulesCount,
        data.standardsBreakdown[std].openViolations,
        data.standardsBreakdown[std].totalViolations
      ]);
    });

    // Violations Sheet
    const detailSheet = workbook.addWorksheet('Violations Log');
    detailSheet.columns = [
      { header: 'Rule Code', key: 'ruleCode', width: 15 },
      { header: 'Standard', key: 'standard', width: 15 },
      { header: 'Node Name', key: 'nodeName', width: 25 },
      { header: 'Sensor Type', key: 'sensorType', width: 15 },
      { header: 'Actual Value', key: 'actualValue', width: 12 },
      { header: 'Expected Threshold', key: 'expectedValue', width: 18 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Logged At', key: 'createdAt', width: 20 }
    ];
    if (data.recentViolations.length > 0) {
      data.recentViolations.forEach(v => detailSheet.addRow(v));
    } else {
      detailSheet.addRow({ ruleCode: 'No records available' });
    }

    await auditExport(req, 'Compliance Report', 'excel', 'Compliance');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Compliance_Report_${new Date().getFullYear()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};


// 3. INCIDENT REPORTS
export const getIncidentsPdf = async (req, res, next) => {
  try {
    const data = await reportService.getIncidentData();
    const doc = new PDFDocument({ margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Incident_Report_${new Date().getFullYear()}.pdf"`);
    doc.pipe(res);

    drawPDFHeader(doc, 'Platform Incident Analysis Report');

    // Section: Executive Summary KPIs
    let y = 120;
    const kpis = [
      { label: 'Total Incidents', value: data.summary.total },
      { label: 'Open Incidents', value: data.summary.open, color: '#dc2626' },
      { label: 'Closed/Resolved', value: data.summary.closed, color: '#16a34a' },
      { label: 'Critical Incidents', value: data.summary.critical, color: '#dc2626' },
      { label: 'Mean Resolution Time', value: `${data.meanResolutionTimeHours} hrs`, color: '#d97706' }
    ];
    y = drawPDFKPIs(doc, 'Incident Metrics Summary', kpis, y);

    // Section: Severity Distribution
    doc.fontSize(11).fillColor('#0f172a').text('SEVERITY DISTRIBUTION', 50, y);
    y += 18;
    const sevHeaders = ['Low Severity', 'Medium Severity', 'High Severity', 'Critical Severity', 'Resolution Rate'];
    const sevRows = [[
      data.severityDistribution.Low,
      data.severityDistribution.Medium,
      data.severityDistribution.High,
      data.severityDistribution.Critical,
      `${data.summary.resolutionRate}%`
    ]];
    y = drawPDFTable(doc, sevHeaders, sevRows, y);
    y += 10;

    // Section: Incident Registry
    doc.fontSize(11).fillColor('#0f172a').text('INCIDENT REGISTRY', 50, y);
    y += 18;
    const incHeaders = ['Incident ID', 'Title', 'Transit Node', 'Severity', 'Status', 'Assigned Team', 'Source'];
    const incRows = data.incidentList.map(i => [
      i.id, i.title, `${i.nodeName} (${i.nodeCode})`, i.severity, i.status, i.assignedTeam, i.source
    ]);
    drawPDFTable(doc, incHeaders, incRows, y);

    drawPDFFooter(doc);
    
    await auditExport(req, 'Incident Report', 'pdf', 'Incident');
    doc.end();
  } catch (error) {
    next(error);
  }
};

export const getIncidentsCsv = async (req, res, next) => {
  try {
    const data = await reportService.getIncidentData();
    const records = data.incidentList.map(i => ({
      'Incident ID': i.id,
      'Title': i.title,
      'Node Code': i.nodeCode,
      'Node Name': i.nodeName,
      'Severity': i.severity,
      'Status': i.status,
      'Assigned Team': i.assignedTeam,
      'Source': i.source,
      'Logged At': i.createdAt,
      'Resolved At': i.resolvedAt || 'N/A'
    }));

    const parser = new Parser();
    const csv = records.length > 0 ? parser.parse(records) : 'Incident ID,Title,Node Code,Node Name,Severity,Status,Assigned Team,Source,Logged At,Resolved At\nNo records available';

    await auditExport(req, 'Incident Report', 'csv', 'Incident');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Incident_Report_${new Date().getFullYear()}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const getIncidentsExcel = async (req, res, next) => {
  try {
    const data = await reportService.getIncidentData();
    const workbook = new ExcelJS.Workbook();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary & Stats');
    summarySheet.addRow(['Metric', 'Value']);
    summarySheet.addRow(['Total Incidents', data.summary.total]);
    summarySheet.addRow(['Open Incidents', data.summary.open]);
    summarySheet.addRow(['Closed/Resolved Incidents', data.summary.closed]);
    summarySheet.addRow(['Critical Incidents', data.summary.critical]);
    summarySheet.addRow(['Incident Resolution Rate %', `${data.summary.resolutionRate}%`]);
    summarySheet.addRow(['Mean Resolution Time (Hours)', data.meanResolutionTimeHours]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Severity', 'Count']);
    Object.keys(data.severityDistribution).forEach(k => {
      summarySheet.addRow([k, data.severityDistribution[k]]);
    });

    // Details sheet
    const detailSheet = workbook.addWorksheet('Incident Registry');
    detailSheet.columns = [
      { header: 'Incident ID', key: 'id', width: 18 },
      { header: 'Title', key: 'title', width: 25 },
      { header: 'Node Code', key: 'nodeCode', width: 12 },
      { header: 'Node Name', key: 'nodeName', width: 20 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Assigned Team', key: 'assignedTeam', width: 15 },
      { header: 'Source', key: 'source', width: 12 },
      { header: 'Logged At', key: 'createdAt', width: 20 }
    ];
    if (data.incidentList.length > 0) {
      data.incidentList.forEach(i => detailSheet.addRow(i));
    } else {
      detailSheet.addRow({ id: 'No records available' });
    }

    await auditExport(req, 'Incident Report', 'excel', 'Incident');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Incident_Report_${new Date().getFullYear()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};


// 4. RISK ANALYSIS REPORTS
export const getRiskPdf = async (req, res, next) => {
  try {
    const data = await reportService.getRiskData();
    const doc = new PDFDocument({ margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Risk_Report_${new Date().getFullYear()}.pdf"`);
    doc.pipe(res);

    drawPDFHeader(doc, 'Safety Risk & Threat Analysis Report');

    // Section: Summary KPIs
    let y = 120;
    const kpis = [
      { label: 'Total Evaluated', value: data.summary.totalNodes },
      { label: 'Low Risk', value: data.summary.distribution.Low, color: '#16a34a' },
      { label: 'Medium Risk', value: data.summary.distribution.Medium, color: '#d97706' },
      { label: 'High Risk', value: data.summary.distribution.High, color: '#dc2626' },
      { label: 'Critical Risk', value: data.summary.distribution.Critical, color: '#dc2626' }
    ];
    y = drawPDFKPIs(doc, 'Risk Distribution Overview', kpis, y);

    // Section: Top Risk Assets
    doc.fontSize(11).fillColor('#0f172a').text('TOP RISK THREAT ASSETS', 50, y);
    y += 18;
    const topHeaders = ['Node Code', 'Node Name', 'Region', 'Status', 'Risk Score', 'Risk Level'];
    const topRows = data.topRiskAssets.map(a => [
      a.nodeCode, a.nodeName, a.region, a.status, `${a.totalRisk}/100`, a.riskLevel
    ]);
    y = drawPDFTable(doc, topHeaders, topRows, y);
    y += 10;

    // Section: Component Heatmap Summary
    doc.fontSize(11).fillColor('#0f172a').text('COMPONENT RISK HEATMAP SUMMARY', 50, y);
    y += 18;
    const heatHeaders = ['Node Name', 'Thermal', 'Electrical', 'Structural', 'Mechanical', 'Signaling', 'Total Score', 'Risk Level'];
    const heatRows = data.heatmapSummary.map(h => [
      h.nodeName, `${h.thermalRisk}%`, `${h.electricalRisk}%`, `${h.structuralRisk}%`, `${h.mechanicalRisk}%`, `${h.signalingRisk}%`, `${h.totalRisk}/100`, h.riskLevel
    ]);
    y = drawPDFTable(doc, heatHeaders, heatRows, y);
    y += 10;

    // Section: Historical Risk Changes
    doc.fontSize(11).fillColor('#0f172a').text('RECENT RISK CORRIDOR LOGS', 50, y);
    y += 18;
    const histHeaders = ['Timestamp', 'Action', 'Asset Code', 'Previous Score', 'Current Score', 'Risk Level'];
    const histRows = data.history.map(h => [
      new Date(h.timestamp).toLocaleString(), h.action, h.nodeCode, `${h.previousScore}/100`, `${h.currentScore}/100`, h.severity
    ]);
    drawPDFTable(doc, histHeaders, histRows, y);

    drawPDFFooter(doc);
    
    await auditExport(req, 'Risk Analysis Report', 'pdf', 'Risk');
    doc.end();
  } catch (error) {
    next(error);
  }
};

export const getRiskCsv = async (req, res, next) => {
  try {
    const data = await reportService.getRiskData();
    const records = data.heatmapSummary.map(r => ({
      'Node Code': r.nodeCode,
      'Node Name': r.nodeName,
      'Thermal Risk %': r.thermalRisk,
      'Electrical Risk %': r.electricalRisk,
      'Structural Risk %': r.structuralRisk,
      'Mechanical Risk %': r.mechanicalRisk,
      'Signaling Risk %': r.signalingRisk,
      'Total Risk Score': r.totalRisk,
      'Risk Level': r.riskLevel
    }));

    const parser = new Parser();
    const csv = records.length > 0 ? parser.parse(records) : 'Node Code,Node Name,Thermal Risk %,Electrical Risk %,Structural Risk %,Mechanical Risk %,Signaling Risk %,Total Risk Score,Risk Level\nNo records available';

    await auditExport(req, 'Risk Analysis Report', 'csv', 'Risk');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Risk_Report_${new Date().getFullYear()}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const getRiskExcel = async (req, res, next) => {
  try {
    const data = await reportService.getRiskData();
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Risk Distribution Level', 'Count']);
    Object.keys(data.summary.distribution).forEach(k => {
      summarySheet.addRow([k, data.summary.distribution[k]]);
    });

    // Details Sheet
    const detailSheet = workbook.addWorksheet('Component Risk Heatmap');
    detailSheet.columns = [
      { header: 'Node Code', key: 'nodeCode', width: 12 },
      { header: 'Node Name', key: 'nodeName', width: 20 },
      { header: 'Thermal Risk %', key: 'thermalRisk', width: 15 },
      { header: 'Electrical Risk %', key: 'electricalRisk', width: 15 },
      { header: 'Structural Risk %', key: 'structuralRisk', width: 15 },
      { header: 'Mechanical Risk %', key: 'mechanicalRisk', width: 15 },
      { header: 'Signaling Risk %', key: 'signalingRisk', width: 15 },
      { header: 'Total Risk Score', key: 'totalRisk', width: 18 },
      { header: 'Risk Level', key: 'riskLevel', width: 15 }
    ];
    if (data.heatmapSummary.length > 0) {
      data.heatmapSummary.forEach(h => detailSheet.addRow(h));
    } else {
      detailSheet.addRow({ nodeCode: 'No records available' });
    }

    // History Sheet
    const historySheet = workbook.addWorksheet('Risk Event Log');
    historySheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 25 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'Asset Code', key: 'nodeCode', width: 15 },
      { header: 'Previous Score', key: 'previousScore', width: 15 },
      { header: 'Current Score', key: 'currentScore', width: 15 },
      { header: 'Severity', key: 'severity', width: 15 }
    ];
    if (data.history.length > 0) {
      data.history.forEach(h => historySheet.addRow(h));
    } else {
      historySheet.addRow({ action: 'No records available' });
    }

    await auditExport(req, 'Risk Analysis Report', 'excel', 'Risk');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Risk_Report_${new Date().getFullYear()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};


// 5. AUTONOMOUS ACTIONS REPORTS
export const getAgentPdf = async (req, res, next) => {
  try {
    const data = await reportService.getAgentData();
    const doc = new PDFDocument({ margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Autonomous_Actions_Report_${new Date().getFullYear()}.pdf"`);
    doc.pipe(res);

    drawPDFHeader(doc, 'Autonomous Recovery & Mitigations Log');

    // Section: Executed Actions KPIs
    let y = 120;
    const kpis = [
      { label: 'Total Agent Decisions', value: data.summary.totalActions },
      { label: 'Success Actions', value: data.summary.success, color: '#16a34a' },
      { label: 'Pending Actions', value: data.summary.pending, color: '#d97706' },
      { label: 'Failed Actions', value: data.summary.failed, color: '#dc2626' },
      { label: 'Success Rate', value: `${data.summary.successRate}%`, color: '#16a34a' },
      { label: 'Mean Confidence', value: `${data.summary.avgConfidence}%`, color: '#16a34a' }
    ];
    y = drawPDFKPIs(doc, 'Agent Operational Performance Metrics', kpis, y);

    // Section: Mitigations Summary
    doc.fontSize(11).fillColor('#0f172a').text('MITIGATION ACTION OUTCOMES', 50, y);
    y += 18;
    const mitHeaders = ['Total Mitigations', 'Completed', 'In Progress', 'Pending', 'Failed'];
    const mitRows = [[
      data.mitigationsSummary.total,
      data.mitigationsSummary.completed,
      data.mitigationsSummary.inProgress,
      data.mitigationsSummary.pending,
      data.mitigationsSummary.failed
    ]];
    y = drawPDFTable(doc, mitHeaders, mitRows, y);
    y += 10;

    // Section: Agent Decision Log
    doc.fontSize(11).fillColor('#0f172a').text('AI AGENT DECISIONS REGISTRY', 50, y);
    y += 18;
    const decHeaders = ['Timestamp', 'Node Name', 'Threat Detected', 'Severity', 'Decision', 'Confidence', 'Status'];
    const decRows = data.decisionsLog.map(d => [
      new Date(d.timestamp).toLocaleString(), d.nodeName, d.threat, d.severity, d.decision, `${d.confidence}%`, d.status
    ]);
    y = drawPDFTable(doc, decHeaders, decRows, y);
    y += 10;

    // Section: Mitigations Log
    doc.fontSize(11).fillColor('#0f172a').text('AUTONOMOUS MITIGATIONS LOG', 50, y);
    y += 18;
    const mHeaders = ['Mitigation ID', 'Action', 'Target Node', 'Source', 'Status', 'Outcome Notes'];
    const mRows = data.mitigationsLog.map(m => [
      m.id, m.action, m.nodeName, m.source, m.status, m.outcome
    ]);
    drawPDFTable(doc, mHeaders, mRows, y);

    drawPDFFooter(doc);
    
    await auditExport(req, 'Autonomous Actions Report', 'pdf', 'AutonomousAgent');
    doc.end();
  } catch (error) {
    next(error);
  }
};

export const getAgentCsv = async (req, res, next) => {
  try {
    const data = await reportService.getAgentData();
    const records = data.decisionsLog.map(d => ({
      'Timestamp': d.timestamp,
      'Node Code': d.nodeCode,
      'Node Name': d.nodeName,
      'Threat Detected': d.threat,
      'Severity': d.severity,
      'Decision': d.decision,
      'Confidence %': d.confidence,
      'Status': d.status,
      'Reasoning': d.reasoning
    }));

    const parser = new Parser();
    const csv = records.length > 0 ? parser.parse(records) : 'Timestamp,Node Code,Node Name,Threat Detected,Severity,Decision,Confidence %,Status,Reasoning\nNo records available';

    await auditExport(req, 'Autonomous Actions Report', 'csv', 'AutonomousAgent');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Autonomous_Actions_Report_${new Date().getFullYear()}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const getAgentExcel = async (req, res, next) => {
  try {
    const data = await reportService.getAgentData();
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Overview');
    summarySheet.addRow(['Agent Performance Metric', 'Value']);
    summarySheet.addRow(['Total Agent Actions', data.summary.totalActions]);
    summarySheet.addRow(['Successful Decisions', data.summary.success]);
    summarySheet.addRow(['Pending Decisions', data.summary.pending]);
    summarySheet.addRow(['Failed Decisions', data.summary.failed]);
    summarySheet.addRow(['Decision Success Rate %', `${data.summary.successRate}%`]);
    summarySheet.addRow(['Average Confidence %', `${data.summary.avgConfidence}%`]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Mitigation Action Status', 'Count']);
    summarySheet.addRow(['Total Mitigations Triggered', data.mitigationsSummary.total]);
    summarySheet.addRow(['Completed Mitigations', data.mitigationsSummary.completed]);
    summarySheet.addRow(['In Progress Mitigations', data.mitigationsSummary.inProgress]);
    summarySheet.addRow(['Pending Mitigations', data.mitigationsSummary.pending]);
    summarySheet.addRow(['Failed Mitigations', data.mitigationsSummary.failed]);

    // Decisions Sheet
    const detailSheet = workbook.addWorksheet('Agent Decision Log');
    detailSheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 25 },
      { header: 'Node Code', key: 'nodeCode', width: 12 },
      { header: 'Node Name', key: 'nodeName', width: 20 },
      { header: 'Threat Detected', key: 'threat', width: 25 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Decision', key: 'decision', width: 25 },
      { header: 'Confidence %', key: 'confidence', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Reasoning', key: 'reasoning', width: 50 }
    ];
    if (data.decisionsLog.length > 0) {
      data.decisionsLog.forEach(d => detailSheet.addRow(d));
    } else {
      detailSheet.addRow({ nodeCode: 'No records available' });
    }

    await auditExport(req, 'Autonomous Actions Report', 'excel', 'AutonomousAgent');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Autonomous_Actions_Report_${new Date().getFullYear()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
