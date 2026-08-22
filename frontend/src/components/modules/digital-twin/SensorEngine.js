/**
 * SensorEngine.js — Weather→Sensor impact engine.
 *
 * Generates realistic sensor data for each train type, modulated by:
 *   1. Train type (passenger vs freight vs commuter)
 *   2. Active map/weather environment
 *   3. Emergency state
 *   4. Random noise (for live feel)
 *
 * Consumed by TrainSensorDashboard and SensorOverlays.
 */

// ═══════════════════════════════════════════════════════════════════
// ENVIRONMENT MODIFIERS — Per-map sensor impact
// ═══════════════════════════════════════════════════════════════════
const ENV_MODIFIERS = {
  sunny:   { temp: 0, hum: 0, vib: 0, volt: 0, pwr: 0, wind: 0, vis: 0, gps: 0, batt: 0, slip: 0, corrosion: 0 },
  rain:    { temp: -3, hum: +40, vib: +0.8, volt: -200, pwr: +0.3, wind: +12, vis: -40, gps: -5, batt: -3, slip: +15, corrosion: +5 },
  storm:   { temp: -5, hum: +50, vib: +1.5, volt: -500, pwr: +1.0, wind: +50, vis: -60, gps: -15, batt: -8, slip: +25, corrosion: +8 },
  snow:    { temp: -40, hum: +10, vib: +0.5, volt: -300, pwr: +0.8, wind: +10, vis: -30, gps: -5, batt: -25, slip: +30, corrosion: +2 },
  fog:     { temp: -2, hum: +30, vib: 0, volt: 0, pwr: 0, wind: 0, vis: -80, gps: -20, batt: -2, slip: +5, corrosion: +3 },
  desert:  { temp: +15, hum: -30, vib: +0.3, volt: +100, pwr: +1.5, wind: +20, vis: -20, gps: 0, batt: -10, slip: -5, corrosion: -2 },
  forest:  { temp: -2, hum: +20, vib: 0, volt: 0, pwr: 0, wind: -5, vis: -10, gps: -8, batt: 0, slip: +3, corrosion: +1 },
  mountain:{ temp: -10, hum: +5, vib: +0.3, volt: -100, pwr: +2.5, wind: +15, vis: -5, gps: -10, batt: -5, slip: +8, corrosion: 0 },
  coastal: { temp: +3, hum: +25, vib: +0.6, volt: -50, pwr: +0.5, wind: +35, vis: -5, gps: 0, batt: -3, slip: +5, corrosion: +20 },
};

// ═══════════════════════════════════════════════════════════════════
// SENSOR DEFINITIONS — Per train type
// ═══════════════════════════════════════════════════════════════════
const SENSOR_TEMPLATES = {
  // ── PASSENGER (Rajdhani, WAP-7+LHB, WAM-4) ──
  passenger: {
    engine: [
      { id: 'engineTemp',     label: 'Engine Temp',    unit: '°C',   base: 85,  range: 5,  envKey: 'temp',  icon: '🌡️', thresholds: { warn: 95, crit: 110 } },
      { id: 'motorTemp',      label: 'Motor Temp',     unit: '°C',   base: 75,  range: 3,  envKey: 'temp',  icon: '⚡', thresholds: { warn: 90, crit: 105 } },
      { id: 'pantographVolt', label: 'Pantograph',     unit: 'kV',   base: 25.0, range: 0.3, envKey: 'volt', icon: '🔌', thresholds: { warn: 23, crit: 21 }, invert: true },
      { id: 'bearingVib',     label: 'Bearing Vib',    unit: 'mm/s', base: 2.1, range: 0.4, envKey: 'vib',  icon: '📳', thresholds: { warn: 4.5, crit: 7.0 } },
      { id: 'battery',        label: 'Battery',        unit: '%',    base: 98,  range: 1,  envKey: 'batt',  icon: '🔋', thresholds: { warn: 60, crit: 30 }, invert: true },
      { id: 'rpm',             label: 'RPM',            unit: '',     base: 1200, range: 50, envKey: null,   icon: '⚙️', thresholds: { warn: 1800, crit: 2200 } },
      { id: 'power',           label: 'Power',          unit: 'MW',   base: 6.2, range: 0.3, envKey: 'pwr', icon: '⚡', thresholds: { warn: 8.0, crit: 9.5 } },
    ],
    coach: [
      { id: 'coachWheel',     label: 'Wheel Temp',     unit: '°C',   base: 40,  range: 3,  envKey: 'temp',  icon: '🛞', thresholds: { warn: 65, crit: 85 } },
      { id: 'coachBrake',     label: 'Brake Press',    unit: 'bar',  base: 5.0, range: 0.2, envKey: 'slip', icon: '🛑', thresholds: { warn: 3.5, crit: 2.5 }, invert: true },
      { id: 'coachDoor',      label: 'Door Status',    unit: '',     base: 1,   range: 0,  envKey: null,    icon: '🚪', isBoolean: true },
      { id: 'coachHVAC',      label: 'HVAC Power',     unit: 'kW',   base: 12,  range: 1,  envKey: 'pwr',   icon: '❄️', thresholds: { warn: 18, crit: 22 } },
      { id: 'coachSuspension', label: 'Suspension',    unit: 'mm/s', base: 1.2, range: 0.3, envKey: 'vib',  icon: '📐', thresholds: { warn: 3.0, crit: 5.0 } },
      { id: 'passengerCount',  label: 'Passengers',    unit: '',     base: 85,  range: 5,  envKey: null,    icon: '👥', thresholds: { warn: 110, crit: 130 } },
    ],
  },

  // ── VANDE BHARAT (integrated trainset) ──
  vandebharat: {
    engine: [
      { id: 'motor',       label: 'Traction Motor',  unit: '°C',   base: 70,  range: 4,  envKey: 'temp',  icon: '⚡', thresholds: { warn: 88, crit: 100 } },
      { id: 'battery',     label: 'Battery',         unit: '%',    base: 96,  range: 1,  envKey: 'batt',  icon: '🔋', thresholds: { warn: 55, crit: 25 }, invert: true },
      { id: 'converter',   label: 'Converter',       unit: 'kV',   base: 25.0, range: 0.2, envKey: 'volt', icon: '🔄', thresholds: { warn: 23, crit: 21 }, invert: true },
      { id: 'brake',       label: 'Brake Press',     unit: 'bar',  base: 5.2, range: 0.2, envKey: 'slip',  icon: '🛑', thresholds: { warn: 3.5, crit: 2.5 }, invert: true },
      { id: 'doors',       label: 'Door Status',     unit: '',     base: 1,   range: 0,  envKey: null,    icon: '🚪', isBoolean: true },
      { id: 'coachHealth',  label: 'Coach Health',   unit: '%',    base: 99,  range: 0.5, envKey: null,   icon: '💚', thresholds: { warn: 85, crit: 70 }, invert: true },
    ],
    coach: [],
  },

  // ── FREIGHT (WAG-9, WAG-12) ──
  freight: {
    engine: [
      { id: 'axle',     label: 'Axle Temp',     unit: '°C',   base: 50,  range: 5,  envKey: 'temp',  icon: '🔥', thresholds: { warn: 70, crit: 90 } },
      { id: 'bearing',  label: 'Bearing Temp',  unit: '°C',   base: 45,  range: 4,  envKey: 'temp',  icon: '📳', thresholds: { warn: 65, crit: 85 } },
      { id: 'wheel',    label: 'Wheel Wear',    unit: 'mm',   base: 0.3, range: 0.05, envKey: 'vib', icon: '🛞', thresholds: { warn: 0.8, crit: 1.2 } },
      { id: 'brake',    label: 'Brake Press',   unit: 'bar',  base: 5.5, range: 0.3, envKey: 'slip',  icon: '🛑', thresholds: { warn: 3.5, crit: 2.0 }, invert: true },
      { id: 'load',     label: 'Load Weight',   unit: 'T',    base: 95,  range: 2,  envKey: null,    icon: '📦', thresholds: { warn: 110, crit: 125 } },
      { id: 'wagonVib', label: 'Wagon Vib',     unit: 'mm/s', base: 2.8, range: 0.5, envKey: 'vib',  icon: '📊', thresholds: { warn: 5.0, crit: 7.5 } },
    ],
    coach: [],
  },

  // ── MEMU (commuter electric) ──
  memu: {
    engine: [
      { id: 'motor',         label: 'Motor Temp',     unit: '°C',  base: 72,  range: 3,  envKey: 'temp',  icon: '⚡', thresholds: { warn: 90, crit: 105 } },
      { id: 'current',       label: 'Current',        unit: 'A',   base: 400, range: 20, envKey: null,    icon: '⚡', thresholds: { warn: 550, crit: 650 } },
      { id: 'voltage',       label: 'Voltage',        unit: 'kV',  base: 25.0, range: 0.3, envKey: 'volt', icon: '🔌', thresholds: { warn: 23, crit: 21 }, invert: true },
      { id: 'brake',         label: 'Brake Press',    unit: 'bar', base: 5.0, range: 0.2, envKey: 'slip',  icon: '🛑', thresholds: { warn: 3.5, crit: 2.5 }, invert: true },
      { id: 'passengerLoad', label: 'Pax Load',       unit: '%',   base: 70,  range: 8,  envKey: null,    icon: '👥', thresholds: { warn: 100, crit: 120 } },
    ],
    coach: [],
  },

  // ── DEMU (diesel electric) ──
  demu: {
    engine: [
      { id: 'fuel',            label: 'Fuel Level',      unit: '%',   base: 82,  range: 0.5, envKey: null,   icon: '⛽', thresholds: { warn: 25, crit: 10 }, invert: true },
      { id: 'dieselEngineTemp', label: 'Diesel Temp',    unit: '°C',  base: 88,  range: 4,   envKey: 'temp', icon: '🌡️', thresholds: { warn: 100, crit: 115 } },
      { id: 'battery',         label: 'Battery',         unit: '%',   base: 95,  range: 1,   envKey: 'batt', icon: '🔋', thresholds: { warn: 55, crit: 25 }, invert: true },
      { id: 'brake',           label: 'Brake Press',     unit: 'bar', base: 5.0, range: 0.2, envKey: 'slip', icon: '🛑', thresholds: { warn: 3.5, crit: 2.5 }, invert: true },
      { id: 'coolingTemp',     label: 'Cooling Temp',    unit: '°C',  base: 75,  range: 3,   envKey: 'temp', icon: '❄️', thresholds: { warn: 90, crit: 105 } },
    ],
    coach: [],
  },
};

// Map train type → sensor template
const TYPE_TO_TEMPLATE = {
  rajdhani: 'passenger',
  vandebharat: 'vandebharat',
  wap7lhb: 'passenger',
  wag9: 'freight',
  wag12: 'freight',
  memu: 'memu',
  demu: 'demu',
  wam4: 'passenger',
};

// ═══════════════════════════════════════════════════════════════════
// SENSOR DATA GENERATOR
// ═══════════════════════════════════════════════════════════════════
/**
 * Generate sensor readings for a specific train in a specific environment.
 *
 * @param {string} trainTypeId - e.g. 'rajdhani', 'wag9'
 * @param {string} envId - e.g. 'sunny', 'desert', 'snow'
 * @param {string|null} emergency - e.g. 'EngineFire', null
 * @param {object} prevData - previous sensor readings for smooth interpolation
 * @returns {{ engine: SensorReading[], coach: SensorReading[] }}
 */
export function generateSensorData(trainTypeId, envId = 'sunny', emergency = null, prevData = null) {
  const templateKey = TYPE_TO_TEMPLATE[trainTypeId] || 'passenger';
  const template = SENSOR_TEMPLATES[templateKey];
  const envMod = ENV_MODIFIERS[envId] || ENV_MODIFIERS.sunny;

  const isFire = emergency === 'EngineFire' || emergency === 'fire';

  const computeValue = (sensor) => {
    if (sensor.isBoolean) return sensor.base;

    let value = sensor.base + (Math.random() - 0.5) * 2 * sensor.range;

    // Apply environmental modifier
    if (sensor.envKey && envMod[sensor.envKey]) {
      const mod = envMod[sensor.envKey];
      if (sensor.unit === 'kV' || sensor.unit === 'bar') {
        // Voltage/pressure: modifier is in V, divide by 1000 for kV
        value += mod / 1000;
      } else if (sensor.unit === '%') {
        value += mod;
      } else {
        value += mod;
      }
    }

    // Emergency overrides
    if (isFire) {
      if (sensor.id.includes('Temp') || sensor.id.includes('temp') || sensor.id === 'engineTemp' || sensor.id === 'motorTemp') {
        value += 40;
      }
      if (sensor.id.includes('bearing') || sensor.id === 'bearingVib') {
        value += 5;
      }
    }

    // Smooth interpolation with previous data
    if (prevData) {
      const prevVal = prevData[sensor.id];
      if (prevVal !== undefined && !isNaN(prevVal)) {
        value = prevVal * 0.85 + value * 0.15; // 85% inertia
      }
    }

    return Number(value.toFixed(sensor.unit === 'mm/s' || sensor.unit === 'MW' || sensor.unit === 'kV' || sensor.unit === 'bar' ? 1 : 0));
  };

  const computeStatus = (sensor, value) => {
    if (sensor.isBoolean) return 'healthy';
    if (!sensor.thresholds) return 'healthy';

    if (sensor.invert) {
      if (value < sensor.thresholds.crit) return 'critical';
      if (value < sensor.thresholds.warn) return 'warning';
    } else {
      if (value > sensor.thresholds.crit) return 'critical';
      if (value > sensor.thresholds.warn) return 'warning';
    }
    return 'healthy';
  };

  const processSensors = (sensors) => sensors.map(sensor => {
    const value = computeValue(sensor);
    return {
      ...sensor,
      value,
      status: computeStatus(sensor, value),
      displayValue: sensor.isBoolean ? (value ? 'Closed' : 'Open') : `${value}`,
    };
  });

  return {
    engine: processSensors(template.engine),
    coach: processSensors(template.coach),
  };
}

// ═══════════════════════════════════════════════════════════════════
// AI INSIGHT GENERATOR — Auto-explain weather impacts
// ═══════════════════════════════════════════════════════════════════
export function generateWeatherInsight(envId, trainTypeId) {
  const insights = {
    desert: {
      reason: 'Ambient temperature exceeds 45°C in desert region.',
      impact: 'Engine and bearing temperatures elevated. Cooling efficiency reduced. Battery discharge rate increased by 10%.',
      prediction: 'If sustained, bearing temperature may reach warning threshold within 2 hours.',
      recommendation: 'Reduce speed by 10%. Activate enhanced cooling protocol. Monitor bearing temperature continuously.',
    },
    snow: {
      reason: 'Sub-zero temperatures (-8°C) with active snowfall.',
      impact: 'Wheel-rail adhesion reduced by 30%. Battery capacity degraded by 25%. Brake efficiency decreased.',
      prediction: 'Track slip events likely at current speed. Battery may reach warning level within 1.5 hours.',
      recommendation: 'Engage sanding system. Reduce speed by 15%. Pre-heat braking system. Monitor wheel slip ratio.',
    },
    rain: {
      reason: 'Heavy monsoon rainfall detected. Track moisture level elevated.',
      impact: 'Track slip coefficient increased by 15%. Bridge vibration elevated. Humidity sensors reading 85%.',
      prediction: 'Bridge stress may trigger maintenance alert if rain continues for 4+ hours.',
      recommendation: 'Reduce speed on bridge sections. Activate anti-slip braking. Monitor bridge structural health.',
    },
    storm: {
      reason: 'Severe thunderstorm with 80+ km/h wind gusts.',
      impact: 'Visibility reduced to 40%. All sensor baselines destabilized. Power fluctuations on OHE.',
      prediction: 'OHE voltage drops likely. Signal communication may degrade. Emergency protocols on standby.',
      recommendation: 'Reduce all train speeds by 30%. Activate storm protocol. Prepare for emergency halt if wind exceeds 100 km/h.',
    },
    fog: {
      reason: 'Dense fog reducing visibility to 20%.',
      impact: 'Signal camera range reduced. GPS accuracy degraded by 20%. Driver visibility near zero.',
      prediction: 'Manual overrides may be needed for signal detection.',
      recommendation: 'Switch to fog-mode operations. Enable AWS (Automatic Warning System). Reduce speed to 50% of max.',
    },
    forest: {
      reason: 'Dense forest region with elevated humidity and wildlife activity.',
      impact: 'Humidity increased 20%. Smoke detection sensitivity increased. Animal crossing alerts active.',
      prediction: 'Low risk of sensor failures. Moderate risk of animal crossing events.',
      recommendation: 'Activate animal crossing horn sequence. Monitor smoke detectors. Maintain current speed.',
    },
    mountain: {
      reason: 'Mountain gradient section requiring increased traction power.',
      impact: 'Power consumption increased by 2.5 MW. Temperature dropped 10°C. Battery drain rate elevated.',
      prediction: 'Gradient section will take 15 minutes. Power demand will normalize on descent.',
      recommendation: 'Pre-position regenerative braking for descent. Monitor traction motor temperature.',
    },
    coastal: {
      reason: 'Coastal region with salt-laden air and high wind exposure.',
      impact: 'Salt corrosion risk elevated for transformer and pantograph. Wind speed 35+ km/h affecting stability.',
      prediction: 'Pantograph arcing risk increased. Transformer corrosion will accumulate over repeated exposure.',
      recommendation: 'Schedule pantograph inspection at next maintenance halt. Monitor transformer insulation resistance.',
    },
    sunny: {
      reason: 'Clear conditions with optimal operating parameters.',
      impact: 'All systems operating within normal range. No environmental stress detected.',
      prediction: 'Current conditions favorable for extended operation.',
      recommendation: 'Maintain current speed and operating parameters.',
    },
  };

  return insights[envId] || insights.sunny;
}
