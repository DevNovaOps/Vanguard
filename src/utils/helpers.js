// ============================================
// VANGUARD ARC — Utility Functions
// ============================================
import { format, formatDistanceToNow } from 'date-fns';

// ── Date Formatting ──
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return format(new Date(dateStr), 'dd MMM yyyy');
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return format(new Date(dateStr), 'dd MMM yyyy, HH:mm');
}

export function formatTime(dateStr) {
  if (!dateStr) return '—';
  return format(new Date(dateStr), 'HH:mm:ss');
}

export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

// ── Status & Severity Colors ──
export function getStatusColor(status) {
  const map = {
    healthy: 'success', active: 'success', normal: 'success', resolved: 'success', executed: 'success',
    warning: 'warning', degraded: 'warning', monitoring: 'warning', pending: 'warning', scheduled: 'warning',
    critical: 'danger', failed: 'danger',
    maintenance: 'info', standby: 'info', investigating: 'info',
  };
  return map[status?.toLowerCase()] || 'neutral';
}

export function getSeverityColor(severity) {
  const map = {
    low: 'success', medium: 'warning', high: 'danger', critical: 'danger',
  };
  return map[severity?.toLowerCase()] || 'neutral';
}

export function getNodeTypeLabel(type) {
  const map = {
    station: 'Station', junction: 'Junction', depot: 'Depot',
    power_hub: 'Power Hub', signal: 'Signal Tower', maintenance: 'Maintenance',
  };
  return map[type] || type;
}

export function getNodeTypeColor(type) {
  const map = {
    station: '#1A56DB', junction: '#0D9488', depot: '#D97706',
    power_hub: '#DC2626', signal: '#8B5CF6', maintenance: '#3B82F6',
  };
  return map[type] || '#6B7280';
}

// ── Number Formatting ──
export function formatNumber(num) {
  if (typeof num === 'string') return num;
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num?.toLocaleString() ?? '0';
}

export function formatPercent(num) {
  if (typeof num === 'string') return num;
  return num?.toFixed(1) + '%';
}

// ── Max Heap Implementation for Incident Prioritization ──
export class MaxHeap {
  constructor(compareFn = (a, b) => a.riskScore - b.riskScore) {
    this.heap = [];
    this.compare = compareFn;
  }

  get size() { return this.heap.length; }

  peek() { return this.heap[0] || null; }

  insert(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  extractMax() {
    if (this.heap.length === 0) return null;
    const max = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return max;
  }

  toArray() {
    return [...this.heap].sort((a, b) => this.compare(b, a));
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.compare(this.heap[i], this.heap[parent]) <= 0) break;
      [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let largest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.compare(this.heap[left], this.heap[largest]) > 0) largest = left;
      if (right < n && this.compare(this.heap[right], this.heap[largest]) > 0) largest = right;
      if (largest === i) break;
      [this.heap[i], this.heap[largest]] = [this.heap[largest], this.heap[i]];
      i = largest;
    }
  }
}

// ── CSV Export ──
export function exportToCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sensor Type Info ──
export function getSensorTypeInfo(type) {
  const map = {
    temperature: { label: 'Temperature', unit: '°C', color: '#DC2626', icon: 'Thermometer' },
    vibration: { label: 'Vibration', unit: 'mm/s', color: '#D97706', icon: 'Activity' },
    pressure: { label: 'Pressure', unit: 'bar', color: '#2563EB', icon: 'Gauge' },
    gas: { label: 'Gas', unit: 'ppm', color: '#059669', icon: 'Wind' },
    power: { label: 'Power', unit: 'kV', color: '#7C3AED', icon: 'Zap' },
    signal: { label: 'Signal', unit: '%', color: '#0D9488', icon: 'Radio' },
  };
  return map[type] || { label: type, unit: '', color: '#6B7280', icon: 'HelpCircle' };
}
