/**
 * TrainAssets.js — Central registry for all train types and their GLB assets.
 *
 * Every train in the system is defined here:
 *   - GLB paths for locomotive and coaches/wagons
 *   - Default speeds and coach counts
 *   - Track assignments and starting positions
 *   - Display metadata (name, icon, color)
 *
 * Used by Train3DModel.jsx and CommandCenter.jsx.
 */

// ═══════════════════════════════════════════════════════════════════
// TRAIN TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════
export const TRAIN_TYPES = {
  rajdhani: {
    id: 'rajdhani',
    name: 'Rajdhani Express',
    shortName: 'Rajdhani',
    icon: '🚂',
    color: '#3b82f6',
    category: 'passenger',
    locoGlb: '/wap_7_new_design_low_poly.glb',
    locoTargetLength: 22,
    locoRotation: [0, -Math.PI / 2, 0],
    coachGlb: '/coach.glb',
    coachTargetLength: 25,
    coachRotation: [0, 0, 0],
    coachCount: 6,
    defaultSpeed: 130,
    maxSpeed: 160,
    sensors: ['engineTemp', 'motorTemp', 'pantographVolt', 'bearingVib', 'battery', 'rpm',
              'coachWheel', 'coachBrake', 'coachDoor', 'coachHVAC', 'coachSuspension', 'passengerCount'],
  },
  vandebharat: {
    id: 'vandebharat',
    name: 'Vande Bharat',
    shortName: 'V. Bharat',
    icon: '🚅',
    color: '#8b5cf6',
    category: 'passenger',
    locoGlb: '/vande_bharat_express.glb',
    locoTargetLength: 150,
    locoRotation: [0, 0, 0],
    coachGlb: null, // integrated trainset
    coachCount: 0,
    defaultSpeed: 160,
    maxSpeed: 200,
    sensors: ['motor', 'battery', 'converter', 'brake', 'doors', 'coachHealth'],
  },
  wap7lhb: {
    id: 'wap7lhb',
    name: 'WAP-7 + LHB',
    shortName: 'WAP-7',
    icon: '🚃',
    color: '#06b6d4',
    category: 'passenger',
    locoGlb: '/wap_7_new_design_low_poly.glb',
    locoTargetLength: 22,
    locoRotation: [0, -Math.PI / 2, 0],
    coachGlb: '/green_express_coach.glb',
    coachTargetLength: 25,
    coachRotation: [0, 0, 0],
    coachCount: 5,
    defaultSpeed: 110,
    maxSpeed: 140,
    sensors: ['engineTemp', 'motorTemp', 'pantographVolt', 'bearingVib', 'battery', 'rpm',
              'coachWheel', 'coachBrake', 'coachDoor', 'coachHVAC'],
  },
  wag9: {
    id: 'wag9',
    name: 'WAG-9 Freight',
    shortName: 'WAG-9',
    icon: '🚛',
    color: '#f59e0b',
    category: 'freight',
    locoGlb: '/wag9.glb',
    locoTargetLength: 22,
    locoRotation: [0, -Math.PI / 2, 0],
    coachGlb: '/eanos_open_wagon.glb',
    coachTargetLength: 25,
    coachRotation: [0, 0, 0],
    coachCount: 8,
    defaultSpeed: 65,
    maxSpeed: 80,
    sensors: ['axle', 'bearing', 'wheel', 'brake', 'load', 'wagonVib'],
  },
  wag12: {
    id: 'wag12',
    name: 'WAG-12 Freight',
    shortName: 'WAG-12',
    icon: '📦',
    color: '#ef4444',
    category: 'freight',
    locoGlb: '/wag-12.glb',
    locoTargetLength: 22,
    locoRotation: [0, -Math.PI / 2, 0],
    coachGlb: '/eanos_open_wagon.glb',
    coachTargetLength: 25,
    coachRotation: [0, 0, 0],
    coachCount: 10,
    defaultSpeed: 60,
    maxSpeed: 75,
    sensors: ['axle', 'bearing', 'wheel', 'brake', 'load', 'wagonVib'],
  },
  memu: {
    id: 'memu',
    name: 'MEMU Local',
    shortName: 'MEMU',
    icon: '🚋',
    color: '#10b981',
    category: 'commuter',
    locoGlb: '/wap_7_new_design_low_poly.glb', // reuse WAP-7 loco
    locoTargetLength: 22,
    locoRotation: [0, -Math.PI / 2, 0],
    coachGlb: '/coach.glb',
    coachTargetLength: 25,
    coachRotation: [0, 0, 0],
    coachCount: 4,
    defaultSpeed: 80,
    maxSpeed: 110,
    sensors: ['motor', 'current', 'voltage', 'brake', 'passengerLoad'],
  },
  demu: {
    id: 'demu',
    name: 'DEMU Express',
    shortName: 'DEMU',
    icon: '⛽',
    color: '#78716c',
    category: 'commuter',
    locoGlb: '/wap_7_new_design_low_poly.glb', // reuse visually
    locoTargetLength: 22,
    locoRotation: [0, -Math.PI / 2, 0],
    coachGlb: '/coach.glb',
    coachTargetLength: 25,
    coachRotation: [0, 0, 0],
    coachCount: 3,
    defaultSpeed: 70,
    maxSpeed: 100,
    sensors: ['fuel', 'dieselEngineTemp', 'battery', 'brake', 'coolingTemp'],
  },
  wam4: {
    id: 'wam4',
    name: 'WAM-4 Mail',
    shortName: 'WAM-4',
    icon: '📬',
    color: '#ec4899',
    category: 'passenger',
    locoGlb: '/wam4.glb',
    locoTargetLength: 22,
    locoRotation: [0, -Math.PI / 2, 0],
    coachGlb: '/coach.glb',
    coachTargetLength: 25,
    coachRotation: [0, 0, 0],
    coachCount: 5,
    defaultSpeed: 90,
    maxSpeed: 120,
    sensors: ['motorTemp', 'current', 'voltage', 'brake', 'pantograph'],
  },
};

// ═══════════════════════════════════════════════════════════════════
// TRAIN FLEET — Active trains with track assignments
// ═══════════════════════════════════════════════════════════════════
// Track offsets: 0 (center), +8 (north), -8 (south)
// startX values spread trains across the map to avoid overlap
import { WORLD_ZONES } from './EnvironmentAssets';

export const TRAIN_FLEET = [
  { typeId: 'rajdhani',    trackOffset: 0,   startX: 500,  active: true },
  { typeId: 'vandebharat', trackOffset: -8,  startX: -1050, active: true },
  { typeId: 'wag12',       trackOffset: 8,   startX: -800,  active: true },
  { typeId: 'wag9',        trackOffset: 8,   startX: 150,   active: true },
  { typeId: 'wam4',        trackOffset: 0,   startX: -280,  active: true },
  { typeId: 'memu',        trackOffset: -8,  startX: 0,     active: false },
  { typeId: 'demu',        trackOffset: -8,  startX: -500,  active: false },
  { typeId: 'wap7lhb',     trackOffset: 0,   startX: -1550, active: false },
];

// Order for display in Train Manager
export const TRAIN_DISPLAY_ORDER = TRAIN_FLEET.map(t => t.typeId);

// All unique GLB paths that need preloading
export const GLB_PRELOAD_LIST = [
  '/vande_bharat_express.glb',
  '/wap_7_new_design_low_poly.glb',
  '/wag-12.glb',
  '/wag9.glb',
  '/wam4.glb',
  '/coach.glb',
  '/green_express_coach.glb',
  '/eanos_open_wagon.glb',
  '/indian_railway_seane_scan_to_lowpoly.glb',
];
