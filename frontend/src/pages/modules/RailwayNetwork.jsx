import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../../components/common/StatusBadge';
import { getNodeTypeLabel } from '../../utils/helpers';
import { useSimulation } from '../../contexts/SimulationContext';
import { Map, ZoomIn, ZoomOut, Maximize2, Wifi, Bot, ShieldAlert } from 'lucide-react';
import { networkService } from '../../utils/networkService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Path interpolation helper for visual telemetry packets along multi-point polylines
function interpolatePath(coords, progress) {
  if (!coords || coords.length === 0) return [0, 0];
  if (coords.length === 1) return coords[0];

  const numSegments = coords.length - 1;
  const segmentProgress = progress * numSegments;
  const segmentIndex = Math.min(Math.floor(segmentProgress), numSegments - 1);
  const localProgress = segmentProgress - segmentIndex;

  const p1 = coords[segmentIndex];
  const p2 = coords[segmentIndex + 1];

  const lat = p1[0] + (p2[0] - p1[0]) * localProgress;
  const lng = p1[1] + (p2[1] - p1[1]) * localProgress;
  return [lat, lng];
}

export default function RailwayNetwork() {
  const [transitNodes, setTransitNodes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [mapMode, setMapMode] = useState('topology');
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  
  const { isRunning } = useSimulation();

  const fetchTopology = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await networkService.getTopology();
      if (res.success) {
        setTransitNodes(res.nodes);
        setRoutes(res.routes || res.connections || []);
        setStats(res.statistics || null);
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
        center: [22.3, 78.0],
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

      // Track zoom level changes
      map.on('zoomend', () => {
        setZoom(map.getZoom());
      });

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

  // Toggle OpenRailwayMap Tile Overlay
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (showOpenRailwayMap) {
      if (!openRailwayMapLayerRef.current) {
        openRailwayMapLayerRef.current = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
          maxZoom: 19,
          opacity: 0.75
        });
      }
      openRailwayMapLayerRef.current.addTo(mapInstanceRef.current);
    } else {
      if (openRailwayMapLayerRef.current) {
        openRailwayMapLayerRef.current.remove();
      }
    }
  }, [showOpenRailwayMap]);

  // Derive filtered datasets
  const filteredNodes = useMemo(() => {
    return transitNodes.filter(node => {
      if (selectedRegion !== 'All' && node.zone !== selectedRegion) return false;
      if (selectedType !== 'All') {
        if (selectedType === 'junction' && node.type !== 'junction') return false;
        if (selectedType === 'station' && node.type !== 'station') return false;
      }
      return true;
    });
  }, [transitNodes, selectedRegion, selectedType]);

  const filteredRoutes = useMemo(() => {
    return routes.filter(route => {
      if (selectedRegion !== 'All' && route.region !== selectedRegion) {
        const fromNode = transitNodes.find(n => n.id === route.from);
        const toNode = transitNodes.find(n => n.id === route.to);
        if (fromNode?.zone !== selectedRegion && toNode?.zone !== selectedRegion) return false;
      }
      return true;
    });
  }, [routes, transitNodes, selectedRegion]);

  // Apply Zoom-Aware rendering levels for Routes
  const visibleRoutes = useMemo(() => {
    return filteredRoutes.filter(route => {
      const fromNode = transitNodes.find(n => n.id === route.from);
      const toNode = transitNodes.find(n => n.id === route.to);
      if (!fromNode || !toNode) return false;

      if (zoom < 6) {
        // Show only major corridors (junction-to-junction)
        return fromNode.type === 'junction' && toNode.type === 'junction';
      } else if (zoom <= 9) {
        // Show regional routes (junctions and depots)
        return (fromNode.type === 'junction' || fromNode.type === 'depot') &&
          (toNode.type === 'junction' || toNode.type === 'depot');
      }
      // Zoom > 9: Show all routes
      return true;
    });
  }, [filteredRoutes, transitNodes, zoom]);

  // Apply Zoom-Aware rendering & Lightweight Clustering for Nodes
  const nodesToRender = useMemo(() => {
    // 1. Determine base visible nodes by zoom level
    const baseVisibleNodes = filteredNodes.filter(node => {
      if (zoom < 6) {
        return node.type === 'junction';
      } else if (zoom <= 9) {
        return node.type === 'junction' || node.type === 'depot';
      }
      return true;
    });

    // 2. Cluster nodes at lower zooms (Zoom < 10) to optimize performance
    if (zoom < 10) {
      const clusterDistance = 1.6 / Math.pow(2, zoom - 5); // Degrees threshold
      const clusters = [];

      baseVisibleNodes.forEach(node => {
        let foundCluster = false;
        for (const cluster of clusters) {
          const dist = Math.sqrt(
            Math.pow(cluster.center.lat - node.lat, 2) +
            Math.pow(cluster.center.lng - node.lng, 2)
          );
          if (dist < clusterDistance) {
            cluster.nodes.push(node);
            const count = cluster.nodes.length;
            cluster.center.lat = (cluster.center.lat * (count - 1) + node.lat) / count;
            cluster.center.lng = (cluster.center.lng * (count - 1) + node.lng) / count;
            foundCluster = true;
            break;
          }
        }
        if (!foundCluster) {
          clusters.push({
            center: { lat: node.lat, lng: node.lng },
            nodes: [node]
          });
        }
      });

      return clusters.map(c => {
        if (c.nodes.length === 1) {
          return { type: 'node', data: c.nodes[0] };
        } else {
          return { type: 'cluster', data: c };
        }
      });
    } else {
      return baseVisibleNodes.map(node => ({ type: 'node', data: node }));
    }
  }, [filteredNodes, zoom]);

  // Render map layers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    // 1. Draw connections/routes
    routes.forEach(route => {
      const fromNode = transitNodes.find(n => n.id === route.from);
      const toNode = transitNodes.find(n => n.id === route.to);
      if (!fromNode || !toNode) return;

      const fromCoords = [fromNode.lat, fromNode.lng];
      const toCoords = [toNode.lat, toNode.lng];

      const routeColor = route.status === 'warning' ? '#D97706' : '#5B87DF';
      const loadOpacity = 0.15 + (route.load / 100) * 0.4;
      const loadWidth = 1 + (route.load / 100) * 2;

      // Glow path
      const glowPath = L.polyline([fromCoords, toCoords], {
        color: routeColor,
        weight: loadWidth + 4,
        opacity: loadOpacity * 0.3,
        interactive: false
      }).addTo(markersGroupRef.current);

      // Core path
      const corePath = L.polyline([fromCoords, toCoords], {
        color: routeColor,
        weight: loadWidth,
        opacity: loadOpacity,
        interactive: true
      }).addTo(markersGroupRef.current);

      // Dashed visual overlay
      L.polyline([fromCoords, toCoords], {
        color: routeColor,
        weight: 1,
        opacity: 0.5,
        dashArray: '6, 4',
        interactive: false
      }).addTo(markersGroupRef.current);

      // Interactive hover highlighting
      corePath.on('mouseover', () => {
        corePath.setStyle({ color: '#38BDF8', weight: loadWidth + 3, opacity: 0.9 });
        glowPath.setStyle({ color: '#38BDF8', weight: loadWidth + 7, opacity: 0.5 });
      });

      corePath.on('mouseout', () => {
        corePath.setStyle({ color: routeColor, weight: loadWidth, opacity: loadOpacity });
        glowPath.setStyle({ color: routeColor, weight: loadWidth + 4, opacity: loadOpacity * 0.35 });
      });

      corePath.bindTooltip(`Route: ${route.routeName}<br/>Load: ${route.load}%<br/>Distance: ${route.distance} km`, {
        sticky: true,
        className: 'custom-tooltip'
      });
    });

    // 2. Risk Heatmap mode overlays
    if (mapMode === 'heatmap') {
      const heatmapNodes = filteredNodes.filter(node => {
        if (zoom < 6) return node.type === 'junction';
        if (zoom <= 9) return node.type === 'junction' || node.type === 'depot';
        return true;
      });

      heatmapNodes.forEach(node => {
        const intensity = node.riskScore / 100;
        const heatRadius = 35 + intensity * 40;
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

    // 3. Draw nodes as custom Leaflet markers using DivIcon
    transitNodes.forEach(node => {
      const isSelected = selectedNode?.id === node.id;
      const markerIcon = L.divIcon({
        className: '',
        html: `<div class="custom-node-marker ${node.status} ${isSelected ? 'selected' : ''}">
          <div class="pulse-ring"></div>
          <div class="node-shape ${node.type}">
            <div class="inner-dot"></div>
          </div>
        </div>`,
        iconSize: isSelected ? [44, 44] : [32, 32],
        iconAnchor: isSelected ? [22, 22] : [16, 16]
      });

      const marker = L.marker([node.lat, node.lng], {
        icon: markerIcon
      }).addTo(markersGroupRef.current);

        marker.on('click', () => {
          setSelectedNode(node);
        });

      marker.bindTooltip(node.name, {
        permanent: false,
        direction: 'top',
        className: 'custom-tooltip',
        offset: [0, -10]
      });
    });
  }, [transitNodes, routes, selectedNode, mapMode]);

  // Buttery-smooth data packet animation loop using requestAnimationFrame
  useEffect(() => {
    if (!mapInstanceRef.current || visibleRoutes.length === 0) return;

    // Disable packet animation on large networks (>= 50 routes) to prevent severe lag
    const runAnimation = (isRunning || mapMode === 'topology') && routes.length < 50;
    if (!runAnimation) return;

    const packets = [];
    const activeMarkers = [];

    visibleRoutes.forEach(route => {
      const fromNode = transitNodes.find(n => n.id === route.from);
      const toNode = transitNodes.find(n => n.id === route.to);
      if (!fromNode || !toNode) return;

      const fromCoords = [fromNode.lat, fromNode.lng];
      const toCoords = [toNode.lat, toNode.lng];

      const routeCoords = route.coordinates && route.coordinates.length > 0
        ? route.coordinates
        : [fromCoords, toCoords];

      const numPackets = Math.ceil(route.load / 30);
      const color = route.status === 'warning' ? '#FBBF24' :
        route.status === 'critical' ? '#EF4444' : '#60A5FA';

      for (let i = 0; i < numPackets; i++) {
        const delay = i * (3 / numPackets) * 1000;
        const duration = (3.5 + Math.random() * 2.5) * 1000;

        const packetMarker = L.circleMarker(routeCoords[0], {
          radius: 2.5,
          fillColor: color,
          color: 'transparent',
          fillOpacity: 0,
          interactive: false
        }).addTo(mapInstanceRef.current);

        activeMarkers.push(packetMarker);

        packets.push({
          marker: packetMarker,
          coords: routeCoords,
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
        const currentLatLng = interpolatePath(p.coords, progress);

        p.marker.setLatLng(currentLatLng);

        // Fade packet out at extremes
        let opacity = 0.95;
        if (progress < 0.08) {
          opacity = (progress / 0.08) * 0.95;
        } else if (progress > 0.92) {
          opacity = ((1 - progress) / 0.08) * 0.95;
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
  }, [visibleRoutes, transitNodes, isRunning, mapMode]);

  // Leaflet Map Actions
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetView = () => {
    mapInstanceRef.current?.setView([22.3, 78.0], 5);
  };

  return (
    <div>
      {/* Dynamic injection of custom stylesheet for premium marker shapes and animations */}
      <style>{`
        /* Custom Leaflet Tooltip */
        .leaflet-tooltip.custom-tooltip {
          background: rgba(10, 14, 28, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
          padding: 6px 10px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
        }
        .leaflet-tooltip-top.custom-tooltip::before {
          border-top-color: rgba(10, 14, 28, 0.9);
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

        /* Custom Cluster Marker */
        .custom-cluster-marker {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .custom-cluster-marker .cluster-shape {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(10, 14, 28, 0.9);
          border: 2px solid var(--cluster-color);
          box-shadow: 0 0 10px var(--glow-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cluster-color);
          font-weight: 700;
          font-size: 11px;
          transition: all 300ms ease;
        }
        .custom-cluster-marker:hover .cluster-shape {
          transform: scale(1.15);
          box-shadow: 0 0 15px var(--glow-color);
        }
        .custom-cluster-marker.healthy {
          --cluster-color: #059669;
          --glow-color: rgba(5, 150, 105, 0.6);
        }
        .custom-cluster-marker.warning {
          --cluster-color: #D97706;
          --glow-color: rgba(217, 119, 6, 0.6);
        }
        .custom-cluster-marker.critical {
          --cluster-color: #DC2626;
          --glow-color: rgba(220, 38, 38, 0.8);
        }
        .custom-cluster-marker.maintenance {
          --cluster-color: #3B82F6;
          --glow-color: rgba(59, 130, 246, 0.5);
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
        .custom-node-marker.healthy, .custom-cluster-marker.healthy {
          --status-color: #059669;
          --glow-color: rgba(5, 150, 105, 0.6);
          --pulse-speed: 3.5s;
        }
        .custom-node-marker.warning, .custom-cluster-marker.warning {
          --status-color: #D97706;
          --glow-color: rgba(217, 119, 6, 0.6);
          --pulse-speed: 2.5s;
        }
        .custom-node-marker.critical, .custom-cluster-marker.critical {
          --status-color: #DC2626;
          --glow-color: rgba(220, 38, 38, 0.8);
          --pulse-speed: 1.5s;
        }
        .custom-node-marker.maintenance, .custom-cluster-marker.maintenance {
          --status-color: #3B82F6;
          --glow-color: rgba(59, 130, 246, 0.5);
          --pulse-speed: 3.5s;
        }

        /* Pulse Ring Animation */
        .custom-node-marker .pulse-ring, .custom-cluster-marker .pulse-ring {
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
            transform: scale(1.35);
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
          <p>Route-based corridor architecture — {visibleRoutes.length} of {routes.length} segments active</p>
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
        style={{ position: 'relative' }}
      >
        {/* Mode Toggle (Top Right) */}
        <div className="map-mode-toggle" style={{ zIndex: 1000, position: 'absolute', top: '12px', right: '12px' }}>
          <button className={mapMode === 'topology' ? 'active' : ''} onClick={() => setMapMode('topology')}>Corridors</button>
          <button className={mapMode === 'heatmap' ? 'active' : ''} onClick={() => setMapMode('heatmap')}>Risk Heatmap</button>
        </div>

        {/* Map Filters Panel (Top Left) */}
        <div className="map-filters-panel" style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1000,
          background: 'rgba(10, 14, 28, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '220px',
          color: 'var(--text-primary)'
        }}>
          <h4 style={{ margin: 0, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Network Filters</h4>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
            <span style={{ fontSize: 'var(--text-xs)' }}>OpenRailwayMap Layer</span>
            <input
              type="checkbox"
              checked={showOpenRailwayMap}
              onChange={(e) => setShowOpenRailwayMap(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '4px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Region Zone</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Regions</option>
              <option value="Northern">Northern</option>
              <option value="North Western">North Western</option>
              <option value="Western">Western</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Node Classification</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Assets</option>
              <option value="junction">Junctions Only</option>
              <option value="station">Stations Only</option>
            </select>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', textAlign: 'right' }}>
            Zoom Level: {Math.round(zoom)}
          </div>
        </div>

        {/* Map Mount Point with Overlays */}
        <div className="railway-map-container-inner" style={{ position: 'relative', width: '100%', height: '500px' }}>
          <div ref={mapRef} className="railway-map-svg" style={{ width: '100%', height: '500px', background: '#0a0e1c' }} />

          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,14,28,0.85)', zIndex: 1000, gap: '1rem', color: 'var(--text-secondary)' }}>
              <div className="loading-spinner" />
              <span>Loading Route Topology...</span>
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

        {/* Floating Network Statistics (Bottom Left) */}
        {stats && (
          <div className="railway-map-stats" style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            zIndex: 1000,
            background: 'rgba(10, 14, 28, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            color: 'var(--text-primary)',
            width: '220px',
            fontSize: 'var(--text-sm)'
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Network Statistics</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Total Stations:</span>
                <span style={{ fontWeight: 'var(--font-bold)' }}>{stats.totalNodes}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Route Segments:</span>
                <span style={{ fontWeight: 'var(--font-bold)' }}>{stats.totalRoutes}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Average Risk:</span>
                <span style={{ fontWeight: 'var(--font-bold)', color: stats.averageRisk >= 40 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {stats.averageRisk}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Critical Alerts:</span>
                <span style={{ fontWeight: 'var(--font-bold)', color: stats.criticalNodes > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {stats.criticalNodes}
                </span>
              </div>
            </div>
          </div>
        )}

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
          {selectedNode && (
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
