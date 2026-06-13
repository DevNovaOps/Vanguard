import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../../components/common/StatusBadge';
import { getNodeTypeLabel } from '../../utils/helpers';
import { useSimulation } from '../../contexts/SimulationContext';
import { Map, ZoomIn, ZoomOut, Maximize2, Wifi, Bot, ShieldAlert } from 'lucide-react';
import { networkService } from '../../utils/networkService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function RailwayNetwork() {
  const [transitNodes, setTransitNodes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [mapMode, setMapMode] = useState('topology');
  const [zoom, setZoom] = useState(5);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  const { isRunning, simulationStore } = useSimulation();

  const displayNodes = transitNodes.map(node => {
    if (simulationStore && node.id === 'TN-011') {
      return {
        ...node,
        status: 'critical',
        riskScore: 95
      };
    }
    return node;
  });

  const displaySelectedNode = selectedNode
    ? (displayNodes.find(n => n.id === selectedNode.id) || selectedNode)
    : null;

  const fetchTopology = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await networkService.getTopology();
      if (res.success) {
        setTransitNodes(res.nodes);
        setRoutes(res.connections);
      } else {
        setError('Failed to fetch railway network topology');
      }
    } catch (err) {
      setError(err.message || 'Error loading railway network');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
  }, []);

  // Initialize the Leaflet map once
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [22.3, 75.0],
        zoom: 5,
        zoomControl: false,
        attributionControl: false
      });

      map.on('zoomend', () => {
        setZoom(map.getZoom());
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = layerGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers, lines, and heatmap overlay dynamically when states change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    // Clear existing layers
    markersGroupRef.current.clearLayers();

    // 1. Draw connections/routes as thin lines
    routes.forEach(route => {
      const fromNode = displayNodes.find(n => n.id === route.from);
      const toNode = displayNodes.find(n => n.id === route.to);
      if (!fromNode || !toNode) return;

      const fromCoords = [fromNode.lat, fromNode.lng];
      const toCoords = [toNode.lat, toNode.lng];

      const routeColor = route.status === 'critical' ? '#DC2626' :
                         route.status === 'warning' ? '#D97706' : '#5B87DF';

      // Draw a single very thin track line
      L.polyline([fromCoords, toCoords], {
        color: routeColor,
        weight: 1.0,
        opacity: 0.6,
        interactive: false
      }).addTo(markersGroupRef.current);
    });

    // 2. Risk Heatmap mode overlays
    if (mapMode === 'heatmap') {
      displayNodes.forEach(node => {
        const intensity = node.riskScore / 100;
        const heatRadius = 40 + intensity * 40;
        const heatColor = node.riskScore >= 70
          ? '#DC2626'
          : node.riskScore >= 40
            ? '#D97706'
            : '#059669';

        L.circleMarker([node.lat, node.lng], {
          radius: heatRadius,
          fillColor: heatColor,
          color: 'transparent',
          fillOpacity: node.riskScore >= 70 ? 0.12 : node.riskScore >= 40 ? 0.08 : 0.06,
          interactive: false
        }).addTo(markersGroupRef.current);
      });
    }

    // 3. Draw nodes as tiny dot circle markers unconditionally
    displayNodes.forEach(node => {
      const isSelected = displaySelectedNode?.id === node.id;

      // Render as a clean, tiny dot (circleMarker) to avoid lag and clutter
      const statusColors = {
        healthy: '#059669',
        warning: '#D97706',
        critical: '#DC2626',
        maintenance: '#3B82F6'
      };
      const color = statusColors[node.status] || '#059669';
      
      const radius = isSelected ? 5.0 : 2.0;
      const weight = isSelected ? 1.5 : 0.5;
      const strokeColor = isSelected ? '#ffffff' : '#0a0e1c';

      const marker = L.circleMarker([node.lat, node.lng], {
        radius,
        fillColor: color,
        color: strokeColor,
        weight,
        opacity: isSelected ? 1.0 : 0.7,
        fillOpacity: isSelected ? 1.0 : 0.8
      }).addTo(markersGroupRef.current);

      marker.on('click', () => {
        setSelectedNode(node);
      });

      marker.bindTooltip(node.name, {
        permanent: false,
        direction: 'top',
        className: 'custom-tooltip',
        offset: [0, isSelected ? -8 : -4]
      });
    });
  }, [displayNodes, routes, displaySelectedNode, mapMode]);

  // Buttery-smooth data packet animation loop using requestAnimationFrame
  useEffect(() => {
    if (!mapInstanceRef.current || routes.length === 0) return;

    // Disable packet animation on large networks (>= 50 routes) to prevent severe lag
    const runAnimation = (isRunning || mapMode === 'topology') && routes.length < 50;
    if (!runAnimation) return;

    const packets = [];
    const activeMarkers = [];

    routes.forEach(route => {
      const fromNode = displayNodes.find(n => n.id === route.from);
      const toNode = displayNodes.find(n => n.id === route.to);
      if (!fromNode || !toNode) return;

      const numPackets = Math.ceil(route.load / 30);
      const color = route.status === 'warning' ? '#FBBF24' : '#60A5FA';

      for (let i = 0; i < numPackets; i++) {
        const delay = i * (3 / numPackets) * 1000; // delay in ms
        const duration = (3 + Math.random() * 2) * 1000; // duration in ms

        const packetMarker = L.circleMarker([fromNode.lat, fromNode.lng], {
          radius: 2.5,
          fillColor: color,
          color: 'transparent',
          fillOpacity: 0,
          interactive: false
        }).addTo(mapInstanceRef.current);

        activeMarkers.push(packetMarker);

        packets.push({
          marker: packetMarker,
          from: [fromNode.lat, fromNode.lng],
          to: [toNode.lat, toNode.lng],
          duration,
          delay,
          color
        });
      }
    });

    let animationFrameId;
    const startTime = performance.now();

    const animate = (timestamp) => {
      const elapsed = timestamp - startTime;

      packets.forEach(p => {
        const packetElapsed = elapsed - p.delay;
        if (packetElapsed < 0) {
          p.marker.setStyle({ fillOpacity: 0 });
          return;
        }

        const progress = (packetElapsed % p.duration) / p.duration;
        const currentLat = p.from[0] + (p.to[0] - p.from[0]) * progress;
        const currentLng = p.from[1] + (p.to[1] - p.from[1]) * progress;

        p.marker.setLatLng([currentLat, currentLng]);

        // Fade in at start, fade out at end
        let opacity = 0.9;
        if (progress < 0.1) {
          opacity = (progress / 0.1) * 0.9;
        } else if (progress > 0.9) {
          opacity = ((1 - progress) / 0.1) * 0.9;
        }

        p.marker.setStyle({ fillOpacity: opacity });
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      activeMarkers.forEach(m => m.remove());
    };
  }, [displayNodes, routes, isRunning, mapMode]);

  // Wire custom premium map controls directly to Leaflet API
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetView = () => {
    mapInstanceRef.current?.setView([22.3, 75.0], 5);
  };

  return (
    <div>
      {/* Dynamic injection of custom stylesheet for premium marker shapes and animations */}
      <style>{`
        /* Custom Leaflet Tooltip */
        .leaflet-tooltip.custom-tooltip {
          background: rgba(10, 14, 28, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
        }
        .leaflet-tooltip-top.custom-tooltip::before {
          border-top-color: rgba(10, 14, 28, 0.85);
        }

        /* Custom Leaflet Marker container */
        .custom-node-marker {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* Base shape styles */
        .custom-node-marker .node-shape {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background-color: var(--status-color);
          border: 1.5px solid var(--status-color);
          box-shadow: 0 0 8px var(--glow-color);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 300ms ease;
        }

        /* Selected state styling */
        .custom-node-marker.selected .node-shape {
          width: 24px;
          height: 24px;
          border-color: #ffffff;
          border-width: 2.5px;
          box-shadow: 0 0 16px var(--glow-color);
        }

        /* Specific Node Type Shapes */
        .custom-node-marker .node-shape.station {
          border-radius: 50%;
        }
        .custom-node-marker .node-shape.junction {
          border-radius: 2px;
          transform: rotate(45deg);
        }
        .custom-node-marker .node-shape.junction .inner-dot {
          transform: rotate(-45deg);
        }
        .custom-node-marker .node-shape.depot {
          border-radius: 3px;
        }
        .custom-node-marker .node-shape.power_hub {
          clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%);
          border-radius: 0;
        }
        .custom-node-marker .node-shape.signal {
          width: 0;
          height: 0;
          border-left: 9px solid transparent;
          border-right: 9px solid transparent;
          border-bottom: 18px solid var(--status-color);
          background-color: transparent;
          border-radius: 0;
          box-shadow: none;
          filter: drop-shadow(0 0 8px var(--glow-color));
        }
        .custom-node-marker.selected .node-shape.signal {
          border-left-width: 12px;
          border-right-width: 12px;
          border-bottom-width: 24px;
          border-bottom-color: #ffffff;
        }

        /* Inner Dot */
        .custom-node-marker .inner-dot {
          width: 5px;
          height: 5px;
          background-color: #ffffff;
          border-radius: 50%;
          opacity: 0.8;
        }
        .custom-node-marker.selected .inner-dot {
          width: 7px;
          height: 7px;
        }

        /* Status colors and Glow */
        .custom-node-marker.healthy {
          --status-color: #059669;
          --glow-color: rgba(5, 150, 105, 0.6);
          --pulse-speed: 3.5s;
        }
        .custom-node-marker.warning {
          --status-color: #D97706;
          --glow-color: rgba(217, 119, 6, 0.6);
          --pulse-speed: 2.5s;
        }
        .custom-node-marker.critical {
          --status-color: #DC2626;
          --glow-color: rgba(220, 38, 38, 0.8);
          --pulse-speed: 1.5s;
        }
        .custom-node-marker.maintenance {
          --status-color: #3B82F6;
          --glow-color: rgba(59, 130, 246, 0.5);
          --pulse-speed: 3.5s;
        }

        /* Pulse Ring Animation */
        .custom-node-marker .pulse-ring {
          position: absolute;
          width: 30px;
          height: 30px;
          border: 1px solid var(--status-color);
          border-radius: 50%;
          opacity: 0.3;
          animation: markerPulse var(--pulse-speed) ease-in-out infinite;
          pointer-events: none;
        }
        .custom-node-marker.selected .pulse-ring {
          width: 40px;
          height: 40px;
        }

        @keyframes markerPulse {
          0% {
            transform: scale(0.7);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.05;
          }
          100% {
            transform: scale(0.7);
            opacity: 0.4;
          }
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1><Map size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /><span className="gradient-text">Railway Network</span></h1>
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
        <div className="map-mode-toggle" style={{ zIndex: 1000 }}>
          <button className={mapMode === 'topology' ? 'active' : ''} onClick={() => setMapMode('topology')}>Topology</button>
          <button className={mapMode === 'heatmap' ? 'active' : ''} onClick={() => setMapMode('heatmap')}>Risk Heatmap</button>
        </div>

        {/* Map Mount Point with Overlays */}
        <div className="railway-map-container-inner" style={{ position: 'relative', width: '100%', height: '500px' }}>
          <div ref={mapRef} className="railway-map-svg" style={{ width: '100%', height: '500px', background: '#0a0e1c' }} />

          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,14,28,0.85)', zIndex: 1000, gap: '1rem', color: 'var(--text-secondary)' }}>
              <div className="loading-spinner" />
              <span>Loading Network Topology...</span>
            </div>
          )}

          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,14,28,0.9)', zIndex: 1000, gap: '1rem', color: 'var(--color-danger)' }}>
              <ShieldAlert size={48} />
              <span>{error}</span>
              <button className="btn btn-secondary btn-sm" onClick={fetchTopology}>Retry Connection</button>
            </div>
          )}
        </div>

        {/* Map Controls */}
        <div className="railway-map-controls" style={{ zIndex: 1000 }}>
          <motion.button className="btn btn-secondary btn-icon btn-sm" onClick={handleZoomIn} title="Zoom In" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><ZoomIn size={16} /></motion.button>
          <motion.button className="btn btn-secondary btn-icon btn-sm" onClick={handleZoomOut} title="Zoom Out" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><ZoomOut size={16} /></motion.button>
          <motion.button className="btn btn-secondary btn-icon btn-sm" onClick={handleResetView} title="Reset" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><Maximize2 size={16} /></motion.button>
        </div>

        {/* Legend */}
        <div className="railway-map-legend" style={{ zIndex: 1000 }}>
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
          {displaySelectedNode && (
            <motion.div
              className="node-detail-panel"
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ zIndex: 1001 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <div>
                  <h3>{displaySelectedNode.name}</h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{displaySelectedNode.id}</span>
                </div>
                <motion.button className="btn btn-ghost btn-sm" onClick={() => setSelectedNode(null)} style={{ padding: '2px 6px' }} whileHover={{ scale: 1.1 }}>✕</motion.button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  ['Type', getNodeTypeLabel(displaySelectedNode.type)],
                  ['Zone', displaySelectedNode.zone],
                  ['Status', <StatusBadge key="s" status={displaySelectedNode.status} dot />],
                  ['Sensors', <span key="sensors" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Wifi size={12} /> {displaySelectedNode.sensors} active</span>],
                  ['Risk Score', <span key="r" style={{ fontWeight: 'var(--font-bold)', color: displaySelectedNode.riskScore >= 70 ? 'var(--color-danger)' : displaySelectedNode.riskScore >= 40 ? 'var(--color-warning)' : 'var(--color-success)' }}>{displaySelectedNode.riskScore}/100</span>],
                  ['AI Recommendation', <span key="ai" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent-400)' }}><Bot size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{displaySelectedNode.riskScore >= 70 ? 'Immediate intervention' : displaySelectedNode.riskScore >= 40 ? 'Schedule inspection' : 'No action needed'}</span>],
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
