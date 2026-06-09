import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../../components/common/StatusBadge';
import { transitNodes, routes } from '../../data/mockData';
import { getNodeTypeLabel } from '../../utils/helpers';
import { useSimulation } from '../../contexts/SimulationContext';
import { Map, ZoomIn, ZoomOut, Maximize2, Activity, Wifi, AlertTriangle, Bot } from 'lucide-react';

const nodePositions = {
  'TN-001': { x: 400, y: 80 },
  'TN-002': { x: 120, y: 380 },
  'TN-003': { x: 420, y: 480 },
  'TN-004': { x: 680, y: 220 },
  'TN-005': { x: 440, y: 160 },
  'TN-006': { x: 340, y: 260 },
  'TN-007': { x: 480, y: 400 },
  'TN-008': { x: 720, y: 270 },
  'TN-009': { x: 500, y: 130 },
  'TN-010': { x: 360, y: 200 },
  'TN-011': { x: 250, y: 320 },
  'TN-012': { x: 500, y: 360 },
  'TN-013': { x: 370, y: 120 },
  'TN-014': { x: 160, y: 420 },
  'TN-015': { x: 460, y: 360 },
  'TN-016': { x: 620, y: 180 },
  'TN-017': { x: 400, y: 320 },
  'TN-018': { x: 340, y: 200 },
  'TN-019': { x: 480, y: 150 },
  'TN-020': { x: 600, y: 400 },
};

const statusColors = {
  healthy: '#059669',
  warning: '#D97706',
  critical: '#DC2626',
  maintenance: '#3B82F6',
};

const statusGlowColors = {
  healthy: 'rgba(5, 150, 105, 0.6)',
  warning: 'rgba(217, 119, 6, 0.6)',
  critical: 'rgba(220, 38, 38, 0.8)',
  maintenance: 'rgba(59, 130, 246, 0.5)',
};

const typeShapes = {
  station: 'circle',
  junction: 'diamond',
  depot: 'square',
  power_hub: 'hexagon',
  signal: 'triangle',
  maintenance: 'square',
};

function NodeShape({ node, pos, isSelected, onClick }) {
  const color = statusColors[node.status] || '#6B7280';
  const glowColor = statusGlowColors[node.status] || 'rgba(107, 114, 128, 0.4)';
  const r = isSelected ? 14 : 10;
  const pulseSpeed = node.status === 'critical' ? '1.5s' : node.status === 'warning' ? '2.5s' : '3.5s';

  return (
    <g onClick={() => onClick(node)} style={{ cursor: 'pointer' }}>
      {/* Outer pulse ring */}
      <circle cx={pos.x} cy={pos.y} r={r + 6} fill="none" stroke={color} strokeWidth="1" opacity="0.3">
        <animate attributeName="r" values={`${r + 4};${r + 12};${r + 4}`} dur={pulseSpeed} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0.05;0.4" dur={pulseSpeed} repeatCount="indefinite" />
      </circle>
      {/* Glow filter effect */}
      {isSelected && (
        <circle cx={pos.x} cy={pos.y} r={r + 2} fill={color} opacity="0.15" filter="url(#nodeGlow)" />
      )}
      {/* Main shape */}
      {typeShapes[node.type] === 'diamond' ? (
        <rect
          x={pos.x - r * 0.7} y={pos.y - r * 0.7}
          width={r * 1.4} height={r * 1.4}
          transform={`rotate(45 ${pos.x} ${pos.y})`}
          rx={2} fill={color}
          stroke={isSelected ? 'white' : color}
          strokeWidth={isSelected ? 3 : 1.5}
          opacity={0.9}
          style={{ transition: 'all 300ms ease', filter: `drop-shadow(0 0 ${isSelected ? 10 : 4}px ${glowColor})` }}
        />
      ) : typeShapes[node.type] === 'square' ? (
        <rect
          x={pos.x - r * 0.7} y={pos.y - r * 0.7}
          width={r * 1.4} height={r * 1.4}
          rx={3} fill={color}
          stroke={isSelected ? 'white' : color}
          strokeWidth={isSelected ? 3 : 1.5}
          opacity={0.9}
          style={{ transition: 'all 300ms ease', filter: `drop-shadow(0 0 ${isSelected ? 10 : 4}px ${glowColor})` }}
        />
      ) : typeShapes[node.type] === 'triangle' ? (
        <polygon
          points={`${pos.x},${pos.y - r} ${pos.x - r},${pos.y + r * 0.7} ${pos.x + r},${pos.y + r * 0.7}`}
          fill={color}
          stroke={isSelected ? 'white' : color}
          strokeWidth={isSelected ? 3 : 1.5}
          opacity={0.9}
          style={{ transition: 'all 300ms ease', filter: `drop-shadow(0 0 ${isSelected ? 10 : 4}px ${glowColor})` }}
        />
      ) : (
        <circle
          cx={pos.x} cy={pos.y} r={r}
          fill={color}
          stroke={isSelected ? 'white' : color}
          strokeWidth={isSelected ? 3 : 1.5}
          opacity={0.9}
          style={{ transition: 'all 300ms ease', filter: `drop-shadow(0 0 ${isSelected ? 10 : 4}px ${glowColor})` }}
        />
      )}
      {/* Inner bright dot */}
      <circle cx={pos.x} cy={pos.y} r={3} fill="white" opacity={0.6} />
    </g>
  );
}

function DataPacket({ from, to, delay, duration, color }) {
  const pathId = `path-${from.x}-${from.y}-${to.x}-${to.y}`;
  return (
    <g>
      <path
        id={pathId}
        d={`M${from.x},${from.y} L${to.x},${to.y}`}
        fill="none"
        stroke="none"
      />
      <circle r="2.5" fill={color} opacity="0.9" style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
        <animateMotion dur={`${duration}s`} repeatCount="indefinite" begin={`${delay}s`}>
          <mpath xlinkHref={`#${pathId}`} />
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;0" dur={`${duration}s`} repeatCount="indefinite" begin={`${delay}s`} />
      </circle>
    </g>
  );
}

export default function RailwayNetwork() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [mapMode, setMapMode] = useState('topology');
  const lastPos = useRef({ x: 0, y: 0 });
  const { isRunning } = useSimulation();

  const handleMouseDown = (e) => {
    setIsPanning(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPan(p => ({
      x: p.x + (e.clientX - lastPos.current.x),
      y: p.y + (e.clientY - lastPos.current.y),
    }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => setIsPanning(false);
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Generate data packets for each route
  const dataPackets = useMemo(() => {
    const packets = [];
    routes.forEach((route, ri) => {
      const from = nodePositions[route.from];
      const to = nodePositions[route.to];
      if (!from || !to) return;
      const color = route.status === 'warning' ? '#FBBF24' : '#60A5FA';
      const numPackets = Math.ceil(route.load / 30);
      for (let i = 0; i < numPackets; i++) {
        packets.push({
          key: `${route.id}-${i}`,
          from, to, color,
          delay: i * (3 / numPackets) + ri * 0.3,
          duration: 3 + Math.random() * 2,
        });
      }
    });
    return packets;
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Map size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Railway Network</h1>
          <p>Interactive infrastructure topology — {transitNodes.length} nodes, {routes.length} routes</p>
        </div>
        <div className="page-actions">
          <span className="live-indicator">LIVE</span>
        </div>
      </div>

      <motion.div
        className="railway-map-container"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Mode Toggle */}
        <div className="map-mode-toggle">
          <button className={mapMode === 'topology' ? 'active' : ''} onClick={() => setMapMode('topology')}>Topology</button>
          <button className={mapMode === 'heatmap' ? 'active' : ''} onClick={() => setMapMode('heatmap')}>Risk Heatmap</button>
        </div>

        <svg
          className="railway-map-svg"
          viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${850 / zoom} ${550 / zoom}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            </pattern>
            <filter id="nodeGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="routeGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <rect width="850" height="550" fill="url(#grid)" />

          {/* Heatmap overlay when in heatmap mode */}
          {mapMode === 'heatmap' && transitNodes.map(node => {
            const pos = nodePositions[node.id];
            if (!pos) return null;
            const intensity = node.riskScore / 100;
            const r = 40 + intensity * 40;
            return (
              <circle
                key={`heat-${node.id}`}
                cx={pos.x} cy={pos.y} r={r}
                fill={node.riskScore >= 70 ? 'rgba(220,38,38,0.12)' : node.riskScore >= 40 ? 'rgba(217,119,6,0.08)' : 'rgba(5,150,105,0.06)'}
                style={{ transition: 'all 500ms ease' }}
              />
            );
          })}

          {/* Routes */}
          {routes.map(route => {
            const from = nodePositions[route.from];
            const to = nodePositions[route.to];
            if (!from || !to) return null;
            const routeColor = route.status === 'warning' ? '#D97706' : '#5B87DF';
            const loadOpacity = 0.15 + (route.load / 100) * 0.4;
            const loadWidth = 1 + (route.load / 100) * 2;
            return (
              <g key={route.id}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={routeColor} strokeWidth={loadWidth + 2} opacity={loadOpacity * 0.3} />
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={routeColor} strokeWidth={loadWidth} opacity={loadOpacity} filter="url(#routeGlow)" />
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={routeColor} strokeWidth={1} strokeDasharray="6 4" className={isRunning || mapMode === 'topology' ? 'route-line' : ''} opacity={0.5} />
              </g>
            );
          })}

          {/* Data Packets */}
          {(isRunning || mapMode === 'topology') && dataPackets.map(packet => (
            <DataPacket key={packet.key} {...packet} />
          ))}

          {/* Node labels */}
          {transitNodes.map(node => {
            const pos = nodePositions[node.id];
            if (!pos) return null;
            return (
              <text key={`label-${node.id}`} x={pos.x} y={pos.y + 24} textAnchor="middle" fill="var(--text-secondary)" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="500" opacity="0.7">
                {node.name.split(' ').slice(0, 2).join(' ')}
              </text>
            );
          })}

          {/* Nodes */}
          {transitNodes.map(node => {
            const pos = nodePositions[node.id];
            if (!pos) return null;
            return (
              <NodeShape key={node.id} node={node} pos={pos} isSelected={selectedNode?.id === node.id} onClick={setSelectedNode} />
            );
          })}
        </svg>

        {/* Map Controls */}
        <div className="railway-map-controls">
          <motion.button className="btn btn-secondary btn-icon btn-sm" onClick={() => setZoom(z => Math.min(z * 1.3, 3))} title="Zoom In" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><ZoomIn size={16} /></motion.button>
          <motion.button className="btn btn-secondary btn-icon btn-sm" onClick={() => setZoom(z => Math.max(z / 1.3, 0.5))} title="Zoom Out" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><ZoomOut size={16} /></motion.button>
          <motion.button className="btn btn-secondary btn-icon btn-sm" onClick={resetView} title="Reset" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><Maximize2 size={16} /></motion.button>
        </div>

        {/* Legend */}
        <div className="railway-map-legend">
          {[
            { color: '#059669', label: 'Healthy' },
            { color: '#D97706', label: 'Warning' },
            { color: '#DC2626', label: 'Critical' },
            { color: '#3B82F6', label: 'Maintenance' },
          ].map(item => (
            <div key={item.label} className="legend-item">
              <div className="legend-dot" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}60` }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Node Detail Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              className="node-detail-panel"
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <div>
                  <h3>{selectedNode.name}</h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{selectedNode.id}</span>
                </div>
                <motion.button className="btn btn-ghost btn-sm" onClick={() => setSelectedNode(null)} style={{ padding: '2px 6px' }} whileHover={{ scale: 1.1 }}>✕</motion.button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  ['Type', getNodeTypeLabel(selectedNode.type)],
                  ['Zone', selectedNode.zone],
                  ['Status', <StatusBadge key="s" status={selectedNode.status} dot />],
                  ['Sensors', <span key="sensors" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Wifi size={12} /> {selectedNode.sensors} active</span>],
                  ['Risk Score', <span key="r" style={{ fontWeight: 'var(--font-bold)', color: selectedNode.riskScore >= 70 ? 'var(--color-danger)' : selectedNode.riskScore >= 40 ? 'var(--color-warning)' : 'var(--color-success)' }}>{selectedNode.riskScore}/100</span>],
                  ['AI Recommendation', <span key="ai" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent-400)' }}><Bot size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{selectedNode.riskScore >= 70 ? 'Immediate intervention' : selectedNode.riskScore >= 40 ? 'Schedule inspection' : 'No action needed'}</span>],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
