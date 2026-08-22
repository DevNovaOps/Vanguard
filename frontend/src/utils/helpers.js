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
    healthy: 'success', active: 'success', normal: 'success', resolved: 'success', executed: 'success', completed: 'success',
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

// ── Comprehensive Node-Category Telemetry Threshold Helper ──
export function getNodeTelemetryThresholds(node) {
  const name = String(node?.nodeName || node?.name || '').toLowerCase();
  const type = String(node?.nodeType || node?.type || '').toLowerCase();

  // 1. Line Locking & Block Section Locking
  if (name.includes('line locking') || name.includes('linelocking') || name.includes('line lock') || name.includes('block locking') || name.includes('auto block')) {
    return {
      categoryKey: 'linelocking',
      category: 'Line Locking & Block Section',
      categoryLabel: 'Line Locking & Block Section',
      temperature: {
        label: 'LINE LOCK BOX TEMP',
        min: 0, max: 80, step: 1, defaultVal: 28,
        warnMin: 40, critMin: 55, unit: '°C',
        desc: 'Trackside Locking Cabinet • Safe: 20–40 °C'
      },
      vibration: {
        label: 'TRACK CIRCUIT VIBRATION',
        min: 0, max: 15, step: 0.1, defaultVal: 1.0,
        warnMin: 2.0, critMin: 4.0, unit: 'mm/s',
        desc: 'Track Circuit & Line Locking • Safe: <2.0 mm/s'
      },
      gas: {
        label: 'LOCKING ENCLOSURE GAS',
        min: 0, max: 100, step: 1, defaultVal: 5,
        warnMin: 15, critMin: 30, unit: 'ppm',
        desc: 'Cabinet Air & Insulation Gas • Safe: <15 ppm'
      },
      power: {
        label: 'LINE LOCK POWER FEEDER',
        min: 0, max: 5.0, step: 0.1, defaultVal: 0.23,
        acceptableMin: 0.10, acceptableMax: 3.5, unit: 'kV',
        typeLabel: 'Line Locking Auxiliary Feeder (230V / 3.3kV)',
        desc: '230V AC / 3.3kV Track Feeder • Safe: 0.10–3.5 kV'
      }
    };
  }

  // 2. Interlocking Cabin / RRI / Signal Tower / Cabin
  if (name.includes('interlocking') || name.includes('rri') || name.includes('cabin') || name.includes('signal') || type.includes('signal')) {
    return {
      categoryKey: 'interlocking',
      category: 'Signaling & Interlocking',
      categoryLabel: 'Interlocking & Signal Cabin',
      temperature: {
        label: 'RELAY ROOM TEMP',
        min: 0, max: 70, step: 1, defaultVal: 24,
        warnMin: 35, critMin: 45, unit: '°C',
        desc: 'Air-conditioned Relay Room • Safe: 18–35 °C'
      },
      vibration: {
        label: 'RELAY RACK VIBRATION',
        min: 0, max: 10, step: 0.1, defaultVal: 0.8,
        warnMin: 1.5, critMin: 3.5, unit: 'mm/s',
        desc: 'Sensitive Electronics Rack • Safe: <1.5 mm/s'
      },
      gas: {
        label: 'BATTERY ROOM GAS',
        min: 0, max: 100, step: 1, defaultVal: 8,
        warnMin: 15, critMin: 30, unit: 'ppm',
        desc: 'UPS Battery Room Gas • Safe: <15 ppm'
      },
      power: {
        label: 'SIGNALING POWER BUS',
        min: 0, max: 5.0, step: 0.1, defaultVal: 0.23,
        acceptableMin: 0.10, acceptableMax: 3.5, unit: 'kV',
        typeLabel: 'Interlocking & Signaling Bus (110V / 230V / 3.3kV)',
        desc: '110V DC / 230V AC Busbar • Safe: 0.10–3.5 kV'
      }
    };
  }

  // 3. Electric & Diesel Loco Shed (ELS/DLS)
  if (name.includes('loco shed') || name.includes('els') || name.includes('dls') || name.includes('electric loco') || name.includes('diesel loco')) {
    return {
      categoryKey: 'loco_shed',
      category: 'Electric & Diesel Loco Shed (ELS/DLS)',
      categoryLabel: 'Loco Shed (ELS / DLS)',
      temperature: {
        label: 'LOCO SHED SHOP TEMP',
        min: 0, max: 100, step: 1, defaultVal: 38,
        warnMin: 55, critMin: 75, unit: '°C',
        desc: 'Locomotive Maintenance Shop • Safe: 20–55 °C'
      },
      vibration: {
        label: 'PIT & SHOP MACHINERY VIB',
        min: 0, max: 25, step: 0.5, defaultVal: 2.8,
        warnMin: 4.0, critMin: 8.0, unit: 'mm/s',
        desc: 'Loco Inspection Pits • Safe: <4.0 mm/s'
      },
      gas: {
        label: 'DIESEL & SOLVENT EXHAUST',
        min: 0, max: 150, step: 1, defaultVal: 18,
        warnMin: 30, critMin: 60, unit: 'ppm',
        desc: 'Loco Shed Exhaust & Fumes • Safe: <30 ppm'
      },
      power: {
        label: 'LOCO SHED POWER GRID',
        min: 0, max: 20.0, step: 0.5, defaultVal: 11.0,
        acceptableMin: 3.0, acceptableMax: 15.0, unit: 'kV',
        typeLabel: 'Loco Shed Power Grid (3.3kV - 15.0kV)',
        desc: 'Shed Power Grid • Safe: 3.0–15.0 kV'
      }
    };
  }

  // 4. Port Rail Terminals & Freight Hubs
  if (name.includes('port rail') || name.includes('port terminal') || name.includes('terminal')) {
    return {
      categoryKey: 'terminal',
      category: 'Port Rail Terminal',
      categoryLabel: 'Port Rail Terminal & Freight Hub',
      temperature: {
        label: 'PORT RAIL TRACK TEMP',
        min: 0, max: 100, step: 1, defaultVal: 36,
        warnMin: 50, critMin: 65, unit: '°C',
        desc: 'Port Track & Crane Rail • Safe: 20–50 °C'
      },
      vibration: {
        label: 'GANTRY & TRACK VIBRATION',
        min: 0, max: 25, step: 0.5, defaultVal: 3.2,
        warnMin: 4.5, critMin: 9.0, unit: 'mm/s',
        desc: 'Port Gantry & Loading Track • Safe: <4.5 mm/s'
      },
      gas: {
        label: 'CONTAINER & FUEL EXHAUST',
        min: 0, max: 150, step: 1, defaultVal: 16,
        warnMin: 25, critMin: 50, unit: 'ppm',
        desc: 'Container Yard Air Quality • Safe: <25 ppm'
      },
      power: {
        label: 'PORT TERMINAL GRID',
        min: 0, max: 20.0, step: 0.5, defaultVal: 11.0,
        acceptableMin: 3.0, acceptableMax: 15.0, unit: 'kV',
        typeLabel: 'Port Terminal High Power Grid (3.3kV - 15.0kV)',
        desc: 'Port Terminal Power Grid • Safe: 3.0–15.0 kV'
      }
    };
  }

  // 5. Marshalling Yards & Container Freight Yards
  if (name.includes('marshalling yard') || name.includes('freight yard') || name.includes('container freight') || name.includes('yard')) {
    return {
      categoryKey: 'yard',
      category: 'Marshalling & Container Yard',
      categoryLabel: 'Marshalling & Freight Yard',
      temperature: {
        label: 'YARD SHUNTING TRACK TEMP',
        min: 0, max: 100, step: 1, defaultVal: 37,
        warnMin: 55, critMin: 70, unit: '°C',
        desc: 'Marshalling Yard Track • Safe: 20–55 °C'
      },
      vibration: {
        label: 'SHUNTING TRACK VIBRATION',
        min: 0, max: 25, step: 0.5, defaultVal: 3.8,
        warnMin: 5.0, critMin: 10.0, unit: 'mm/s',
        desc: 'Low-Speed Shunting Track • Safe: <5.0 mm/s'
      },
      gas: {
        label: 'CONTAINER & CARGO GAS',
        min: 0, max: 150, step: 1, defaultVal: 20,
        warnMin: 30, critMin: 60, unit: 'ppm',
        desc: 'Cargo & Container Fumes • Safe: <30 ppm'
      },
      power: {
        label: 'YARD AUXILIARY FEEDER',
        min: 0, max: 15.0, step: 0.5, defaultVal: 6.6,
        acceptableMin: 3.0, acceptableMax: 11.5, unit: 'kV',
        typeLabel: 'Yard Auxiliary Power Grid (3.3kV - 11.0kV)',
        desc: 'Yard Power Grid • Safe: 3.0–11.5 kV'
      }
    };
  }

  // 6. Outer Post / Gate / Block Post / Level Crossing
  if (name.includes('post') || name.includes('outer') || name.includes('gate') || name.includes('crossing') || name.includes('block')) {
    return {
      categoryKey: 'post',
      category: 'Outer Post & Level Crossing',
      categoryLabel: 'Outer Post & Level Crossing',
      temperature: {
        label: 'CABINET ENCLOSURE TEMP',
        min: 0, max: 80, step: 1, defaultVal: 32,
        warnMin: 45, critMin: 60, unit: '°C',
        desc: 'Outdoor Electronics Cabinet • Safe: 20–45 °C'
      },
      vibration: {
        label: 'GATE BARRIER VIBRATION',
        min: 0, max: 15, step: 0.5, defaultVal: 1.2,
        warnMin: 2.5, critMin: 5.0, unit: 'mm/s',
        desc: 'Level Crossing Mechanism • Safe: <2.5 mm/s'
      },
      gas: {
        label: 'AMBIENT ROAD EXHAUST',
        min: 0, max: 100, step: 1, defaultVal: 12,
        warnMin: 20, critMin: 40, unit: 'ppm',
        desc: 'Crossing Air Quality • Safe: <20 ppm'
      },
      power: {
        label: 'POST POWER FEEDER',
        min: 0, max: 5.0, step: 0.1, defaultVal: 0.23,
        acceptableMin: 0.10, acceptableMax: 3.5, unit: 'kV',
        typeLabel: 'Auxiliary Gate & Post Power (230V / 3.3kV)',
        desc: '230V AC / 3.3kV Feeder • Safe: 0.10–3.5 kV'
      }
    };
  }

  // 7. Freight / Goodshed / Industrial Siding
  if (name.includes('siding') || name.includes('goodshed') || name.includes('industrial') || type.includes('siding')) {
    return {
      categoryKey: 'siding',
      category: 'Industrial & Goodshed Siding',
      categoryLabel: 'Industrial & Goodshed Siding',
      temperature: {
        label: 'SIDING TRACK TEMP',
        min: 0, max: 100, step: 1, defaultVal: 38,
        warnMin: 50, critMin: 65, unit: '°C',
        desc: 'Freight Yard Track • Safe: 20–50 °C'
      },
      vibration: {
        label: 'YARD TRACK VIBRATION',
        min: 0, max: 25, step: 0.5, defaultVal: 3.5,
        warnMin: 6.0, critMin: 12.0, unit: 'mm/s',
        desc: 'Low-Speed Freight Yard Track • Safe: <6.0 mm/s'
      },
      gas: {
        label: 'CARGO & FUEL GAS',
        min: 0, max: 150, step: 1, defaultVal: 18,
        warnMin: 35, critMin: 70, unit: 'ppm',
        desc: 'Freight Cargo Area Gas • Safe: <35 ppm'
      },
      power: {
        label: 'SIDING INDUSTRIAL FEEDER',
        min: 0, max: 15.0, step: 0.5, defaultVal: 6.6,
        acceptableMin: 3.0, acceptableMax: 11.5, unit: 'kV',
        typeLabel: 'Siding Auxiliary Grid (3.3kV - 11.0kV)',
        desc: 'Siding Auxiliary Grid • Safe: 3.0–11.5 kV'
      }
    };
  }

  // 8. Traction Substation / Power Hub
  if (name.includes('substation') || name.includes('power hub') || name.includes('tss') || name.includes('traction power') || type.includes('power_hub')) {
    return {
      categoryKey: 'substation',
      category: 'Traction Substation (TSS) & Power Hub',
      categoryLabel: 'Traction Substation & Power Hub',
      temperature: {
        label: 'TRANSFORMER OIL TEMP',
        min: 0, max: 100, step: 1, defaultVal: 45,
        warnMin: 65, critMin: 85, unit: '°C',
        desc: 'Traction Substation Transformer • Safe: 25–65 °C'
      },
      vibration: {
        label: 'TRANSFORMER FRAME VIBRATION',
        min: 0, max: 15, step: 0.5, defaultVal: 1.5,
        warnMin: 3.0, critMin: 6.0, unit: 'mm/s',
        desc: 'Substation Transformer Frame • Safe: <3.0 mm/s'
      },
      gas: {
        label: 'DGA DISSOLVED OIL GAS',
        min: 0, max: 100, step: 1, defaultVal: 10,
        warnMin: 20, critMin: 40, unit: 'ppm',
        desc: 'Dissolved Gas Analysis (DGA) • Safe: <20 ppm'
      },
      power: {
        label: 'TRACTION OHE VOLTAGE',
        min: 0, max: 35.0, step: 0.5, defaultVal: 24.5,
        acceptableMin: 21.0, acceptableMax: 27.0, unit: 'kV',
        typeLabel: 'Overhead Traction Grid (25kV AC OHE)',
        desc: '25kV AC OHE Supply • Safe: 21.0–27.0 kV'
      }
    };
  }

  // 9. Maintenance Depot / Workshop
  if (name.includes('depot') || name.includes('workshop') || type.includes('depot')) {
    return {
      categoryKey: 'depot',
      category: 'Maintenance Depot & Workshop',
      categoryLabel: 'Maintenance Depot & Workshop',
      temperature: {
        label: 'WORKSHOP SHOPFLOOR TEMP',
        min: 0, max: 100, step: 1, defaultVal: 40,
        warnMin: 50, critMin: 70, unit: '°C',
        desc: 'Carriage Workshop • Safe: 20–50 °C'
      },
      vibration: {
        label: 'MACHINERY VIBRATION',
        min: 0, max: 25, step: 0.5, defaultVal: 3.0,
        warnMin: 4.5, critMin: 9.0, unit: 'mm/s',
        desc: 'Workshop Tools & Machinery • Safe: <4.5 mm/s'
      },
      gas: {
        label: 'SOLVENT & FAULT GAS',
        min: 0, max: 150, step: 1, defaultVal: 15,
        warnMin: 25, critMin: 50, unit: 'ppm',
        desc: 'Workshop Solvents & Fumes • Safe: <25 ppm'
      },
      power: {
        label: 'DEPOT INDUSTRIAL GRID',
        min: 0, max: 20.0, step: 0.5, defaultVal: 11.0,
        acceptableMin: 3.0, acceptableMax: 15.0, unit: 'kV',
        typeLabel: 'Depot Power Grid (3.3kV - 15.0kV)',
        desc: 'Depot Power Grid • Safe: 3.0–15.0 kV'
      }
    };
  }

  // 10. Default: Main Line Junction / Station
  return {
    categoryKey: 'junction',
    category: 'Junction & Main Station',
    categoryLabel: 'Junction & Main Station',
    temperature: {
      label: 'TRANSFORMER & RAIL TEMP',
      min: 0, max: 100, step: 1, defaultVal: 42,
      warnMin: 60, critMin: 80, unit: '°C',
      desc: 'Main Line Equipment • Safe: 25–60 °C'
    },
    vibration: {
      label: 'MAINLINE TRACK VIBRATION',
      min: 0, max: 20, step: 0.5, defaultVal: 2.2,
      warnMin: 4.0, critMin: 7.5, unit: 'mm/s',
      desc: 'High-Speed Main Line Track • Safe: <4.0 mm/s'
    },
    gas: {
      label: 'SUBSTATION OIL GAS',
      min: 0, max: 100, step: 1, defaultVal: 10,
      warnMin: 25, critMin: 50, unit: 'ppm',
      desc: 'Traction Substation Transformer • Safe: <25 ppm'
    },
    power: {
      label: 'TRACTION OHE VOLTAGE',
      min: 0, max: 35.0, step: 0.5, defaultVal: 24.5,
      acceptableMin: 21.0, acceptableMax: 27.0, unit: 'kV',
      typeLabel: 'Overhead Traction Grid (25kV AC OHE)',
      desc: '25kV AC OHE Supply • Safe: 21.0–27.0 kV'
    }
  };
}

// ── Backward Compatibility Alias for Voltage ──
export function getNodeVoltageThresholds(node) {
  const full = getNodeTelemetryThresholds(node);
  return {
    category: full.category,
    typeLabel: full.power.typeLabel,
    min: full.power.min,
    max: full.power.max,
    step: full.power.step,
    defaultVal: full.power.defaultVal,
    acceptableMin: full.power.acceptableMin,
    acceptableMax: full.power.acceptableMax,
    unit: full.power.unit,
    nominal: full.power.desc
  };
}
