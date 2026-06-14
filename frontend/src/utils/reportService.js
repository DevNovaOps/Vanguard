/**
 * Report Utility Service
 * Handles report download request, token injection, and browser response streaming.
 */
export async function downloadReport(key, format, reportTitle) {
  const token = localStorage.getItem('arc_token');
  const response = await fetch(`/api/reports/${key}/${format}`, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });

  if (!response.ok) {
    let errMsg = 'Export failed';
    try {
      const errData = await response.json();
      errMsg = errData.message || errMsg;
    } catch {
      const text = await response.text();
      if (text) errMsg = text;
    }
    throw new Error(errMsg);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const cleanTitle = reportTitle.replace(/\s+/g, '_');
  const year = new Date().getFullYear();
  const extMap = { pdf: 'pdf', csv: 'csv', excel: 'xlsx' };
  const ext = extMap[format] || 'pdf';

  a.download = `${cleanTitle.replace('_Report', '')}_Report_${year}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
