import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Shield, Radio, AlertTriangle, Bot, BarChart3, Map, ArrowRight, CheckCircle, Activity, Zap, Eye, Thermometer, Gauge, Signal } from 'lucide-react';
import heroVideo from '../../assets/Train_moves_into_station_202606111616.mp4';

const STATS = [
  { value: '10,000+', label: 'Sensors Monitored' },
  { value: '99.97%', label: 'System Uptime' },
  { value: '156', label: 'Auto Actions/Day' },
  { value: '47', label: 'Hours Downtime Prevented' },
];

const FEATURES = [
  { icon: Radio, title: 'Real-Time Telemetry', description: 'Monitor 284+ sensors across the rail network with live temperature, vibration, pressure, and signal health streams.' },
  { icon: AlertTriangle, title: 'Risk Analysis Engine', description: 'AI-powered risk scoring with predictive failure detection and threat matrix visualization for proactive maintenance.' },
  { icon: Shield, title: 'Compliance Center', description: 'Automated compliance validation against API617, RDSO, and IEC standards with real-time violation tracking.' },
  { icon: Bot, title: 'Autonomous Agent', description: 'AI decision engine that autonomously generates incidents, prioritizes via Max Heap, and executes mitigation actions.' },
  { icon: Map, title: 'Railway Network Map', description: 'Interactive visualization of stations, junctions, depots, and routes with live status indicators and data flow.' },
  { icon: BarChart3, title: 'Executive Reports', description: 'Auto-generated compliance, incident, and infrastructure reports with PDF, CSV, and Excel export capabilities.' },
];

const FLOATING_PANELS = [
  { value: '284', label: 'Active Sensors', color: '#60A5FA', icon: Radio },
  { value: '99.97%', label: 'System Uptime', color: '#34D399', icon: Activity },
  { value: '156', label: 'Auto Actions', color: '#00D2FF', icon: Bot },
  { value: '94.2%', label: 'Compliance', color: '#FBBF24', icon: Shield },
];

const AI_FEED_ITEMS = [
  { text: 'Risk Analysis Complete — TN-011', icon: Activity, type: 'success' },
  { text: 'Compliance Audit Passed — Zone A', icon: Shield, type: 'success' },
  { text: 'Maintenance Alert — Bhusawal Hub', icon: AlertTriangle, type: 'warning' },
  { text: 'Mitigation Executed — Speed Limit', icon: Zap, type: 'success' },
  { text: 'Anomaly Detected — Sensor S-204', icon: Eye, type: 'danger' },
  { text: 'Risk Score Recalculated — TN-007', icon: Activity, type: 'info' },
  { text: 'Power Rerouting — Jhansi Hub', icon: Zap, type: 'info' },
  { text: 'Sensor Calibrated — S-019', icon: Radio, type: 'success' },
];

/* Network topology for animated SVG */
const NODES = [
  { id: 0, cx: 80, cy: 180, type: 'station', label: 'Mumbai Central' },
  { id: 1, cx: 220, cy: 120, type: 'junction', label: 'Nashik Jn' },
  { id: 2, cx: 380, cy: 200, type: 'station', label: 'Bhusawal' },
  { id: 3, cx: 520, cy: 100, type: 'power', label: 'Power Hub A' },
  { id: 4, cx: 680, cy: 180, type: 'station', label: 'Nagpur' },
  { id: 5, cx: 850, cy: 130, type: 'junction', label: 'Jhansi Jn' },
  { id: 6, cx: 1000, cy: 200, type: 'station', label: 'Delhi' },
  { id: 7, cx: 150, cy: 350, type: 'depot', label: 'Depot Alpha' },
  { id: 8, cx: 350, cy: 420, type: 'signal', label: 'Signal S-11' },
  { id: 9, cx: 550, cy: 360, type: 'station', label: 'Bhopal' },
  { id: 10, cx: 750, cy: 400, type: 'junction', label: 'Itarsi Jn' },
  { id: 11, cx: 950, cy: 360, type: 'depot', label: 'Depot Beta' },
  { id: 12, cx: 300, cy: 300, type: 'signal', label: 'Signal S-07' },
  { id: 13, cx: 600, cy: 250, type: 'power', label: 'Power Hub B' },
  { id: 14, cx: 440, cy: 500, type: 'station', label: 'Itarsi' },
  { id: 15, cx: 180, cy: 500, type: 'junction', label: 'Pune Jn' },
];

const ROUTES = [
  { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
  { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 0, to: 7 }, { from: 7, to: 8 },
  { from: 8, to: 9 }, { from: 9, to: 10 }, { from: 10, to: 11 }, { from: 1, to: 12 },
  { from: 12, to: 9 }, { from: 2, to: 13 }, { from: 13, to: 4 }, { from: 8, to: 14 },
  { from: 14, to: 10 }, { from: 7, to: 15 }, { from: 15, to: 14 }, { from: 3, to: 13 },
];

const SENSOR_INDICATORS = [
  { x: 100, y: 220, label: '72.4°C', type: 'temp', status: 'normal' },
  { x: 400, y: 240, label: '78.1°C', type: 'temp', status: 'warning' },
  { x: 700, y: 220, label: '0.8g', type: 'vibration', status: 'normal' },
  { x: 560, y: 400, label: '22.1kV', type: 'power', status: 'normal' },
  { x: 960, y: 400, label: '1.2g', type: 'vibration', status: 'warning' },
];

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  cx: Math.random() * 1100 + 20,
  cy: Math.random() * 550 + 20,
  r: Math.random() * 1.5 + 0.5,
  dur: Math.random() * 6 + 4,
  delay: Math.random() * 5,
}));

const featureContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const featureCardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 15,
      duration: 0.6,
    },
  },
};

const heroContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const heroChildVariants = {
  hidden: { opacity: 0, y: 35 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function LandingPage() {
  const [feedIndex, setFeedIndex] = useState(0);
  const [visibleFeed, setVisibleFeed] = useState(AI_FEED_ITEMS.slice(0, 4));
  const [videoEnded, setVideoEnded] = useState(false);
  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.55, 0.95]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeedIndex(prev => {
        const next = (prev + 1) % AI_FEED_ITEMS.length;
        setVisibleFeed([
          AI_FEED_ITEMS[next],
          AI_FEED_ITEMS[(next + 1) % AI_FEED_ITEMS.length],
          AI_FEED_ITEMS[(next + 2) % AI_FEED_ITEMS.length],
          AI_FEED_ITEMS[(next + 3) % AI_FEED_ITEMS.length],
        ]);
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleRestartVideo = () => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(err => console.log('Video play error:', err));
        setVideoEnded(false);
      }
    };

    window.addEventListener('restart-train-video', handleRestartVideo);
    return () => window.removeEventListener('restart-train-video', handleRestartVideo);
  }, []);

  return (
    <div>
      {/* ────── HERO SECTION ────── */}
      <section className="landing-hero" ref={heroRef}>

        {/* Layer 0: Background video — plays once on landing with scroll-linked zoom & parallax */}
        <motion.video
          ref={videoRef}
          className={`hero-bg-video${videoEnded ? ' hero-bg-video--ended' : ''}`}
          src={heroVideo}
          autoPlay
          muted
          playsInline
          onEnded={() => setVideoEnded(true)}
          style={{ y: videoY, scale: videoScale }}
        />

        {/* Layer 1: Dark overlay */}
        <div className="hero-bg-overlay" />

        {/* Layer 2: Animated gradient mesh */}
        <div className="hero-gradient-mesh" />

        {/* Layer 3: Railway network overlay (the main animated background) */}
        <div className="hero-network-overlay">
          <svg width="100%" height="100%" viewBox="0 0 1100 580" preserveAspectRatio="xMidYMid slice">
            <defs>
              <filter id="heroGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="routeGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(96,165,250,0.05)" />
                <stop offset="50%" stopColor="rgba(96,165,250,0.25)" />
                <stop offset="100%" stopColor="rgba(96,165,250,0.05)" />
              </linearGradient>
              <linearGradient id="routeGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(45,212,191,0.05)" />
                <stop offset="50%" stopColor="rgba(45,212,191,0.2)" />
                <stop offset="100%" stopColor="rgba(45,212,191,0.05)" />
              </linearGradient>
            </defs>

            {/* Ambient particles */}
            {PARTICLES.map(p => (
              <circle key={`p-${p.id}`} cx={p.cx} cy={p.cy} r={p.r} fill="rgba(96,165,250,0.3)">
                <animate attributeName="opacity" values="0;0.6;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
                <animate attributeName="cy" values={`${p.cy};${p.cy - 20};${p.cy}`} dur={`${p.dur * 1.5}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Glowing route lines */}
            {ROUTES.map((route, i) => {
              const from = NODES[route.from];
              const to = NODES[route.to];
              const midX = (from.cx + to.cx) / 2 + (i % 2 === 0 ? 15 : -15);
              const midY = (from.cy + to.cy) / 2 + (i % 3 === 0 ? -20 : 10);
              const pathD = `M${from.cx},${from.cy} Q${midX},${midY} ${to.cx},${to.cy}`;
              const routeId = `route-${i}`;
              return (
                <g key={routeId}>
                  {/* Base glow line */}
                  <path d={pathD} fill="none" stroke="rgba(96,165,250,0.06)" strokeWidth="6" />
                  {/* Main route line */}
                  <path d={pathD} fill="none" stroke={i % 3 === 0 ? 'rgba(45,212,191,0.2)' : 'rgba(96,165,250,0.18)'} strokeWidth="1.5" />
                  {/* Animated dashed overlay */}
                  <path
                    d={pathD} fill="none"
                    stroke={i % 3 === 0 ? 'rgba(45,212,191,0.35)' : 'rgba(96,165,250,0.3)'}
                    strokeWidth="1" strokeDasharray="4 8"
                    style={{ animation: `flowDash ${2.5 + (i % 4) * 0.5}s linear infinite` }}
                  />
                  {/* Data packet path */}
                  <path id={routeId} d={pathD} fill="none" />
                </g>
              );
            })}

            {/* Data packets traveling along routes */}
            {ROUTES.map((route, i) => {
              if (i % 2 !== 0) return null; // Only every other route gets packets
              const color = i % 3 === 0 ? '#2DD4BF' : '#60A5FA';
              return (
                <g key={`pkt-${i}`}>
                  <circle r="2" fill={color} filter="url(#heroGlow)" opacity="0.9">
                    <animateMotion dur={`${4 + (i % 3) * 1.5}s`} repeatCount="indefinite" begin={`${(i * 0.7) % 4}s`}>
                      <mpath xlinkHref={`#route-${i}`} />
                    </animateMotion>
                  </circle>
                  {/* Second packet offset */}
                  <circle r="1.5" fill={color} filter="url(#heroGlow)" opacity="0.6">
                    <animateMotion dur={`${5 + (i % 3) * 1.5}s`} repeatCount="indefinite" begin={`${2 + (i * 0.5) % 3}s`}>
                      <mpath xlinkHref={`#route-${i}`} />
                    </animateMotion>
                  </circle>
                </g>
              );
            })}

            {/* Station/junction nodes with pulsing */}
            {NODES.map((node, i) => {
              const baseR = node.type === 'station' ? 5 : node.type === 'junction' ? 4 : 3;
              const color = node.type === 'station' ? '#60A5FA'
                : node.type === 'junction' ? '#00D2FF'
                : node.type === 'power' ? '#FBBF24'
                : node.type === 'depot' ? '#34D399'
                : '#F87171';
              const pulseR = baseR + 8;
              return (
                <g key={`node-${i}`}>
                  {/* Outer pulse ring */}
                  <circle cx={node.cx} cy={node.cy} r={pulseR} fill="none" stroke={color} strokeWidth="0.8" opacity="0.2">
                    <animate attributeName="r" values={`${baseR + 4};${pulseR};${baseR + 4}`} dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.05;0.3" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                  {/* Glow background */}
                  <circle cx={node.cx} cy={node.cy} r={baseR + 2} fill={color} opacity="0.08" />
                  {/* Core node */}
                  {node.type === 'junction' ? (
                    <rect x={node.cx - baseR} y={node.cy - baseR} width={baseR * 2} height={baseR * 2}
                      rx="2" fill={color} opacity="0.7" transform={`rotate(45 ${node.cx} ${node.cy})`}
                      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                    />
                  ) : node.type === 'signal' ? (
                    <polygon points={`${node.cx},${node.cy - baseR} ${node.cx - baseR},${node.cy + baseR * 0.7} ${node.cx + baseR},${node.cy + baseR * 0.7}`}
                      fill={color} opacity="0.7" style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                    />
                  ) : (
                    <circle cx={node.cx} cy={node.cy} r={baseR} fill={color} opacity="0.7"
                      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                    />
                  )}
                  {/* Center bright dot */}
                  <circle cx={node.cx} cy={node.cy} r="1.5" fill="white" opacity="0.5" />
                </g>
              );
            })}

            {/* Animated sensor indicators */}
            {SENSOR_INDICATORS.map((s, i) => (
              <g key={`sensor-${i}`}>
                <rect x={s.x - 22} y={s.y - 8} width="44" height="16" rx="4"
                  fill={s.status === 'warning' ? 'rgba(217,119,6,0.2)' : 'rgba(96,165,250,0.12)'}
                  stroke={s.status === 'warning' ? 'rgba(217,119,6,0.3)' : 'rgba(96,165,250,0.15)'}
                  strokeWidth="0.5"
                />
                <text x={s.x} y={s.y + 3} textAnchor="middle" fill={s.status === 'warning' ? '#FBBF24' : '#60A5FA'} fontSize="7"
                  fontFamily="'JetBrains Mono', monospace" fontWeight="600" opacity="0.8"
                >
                  {s.label}
                </text>
                {s.status === 'warning' && (
                  <circle cx={s.x + 18} cy={s.y - 5} r="2" fill="#FBBF24">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Layer 4: Floating Intelligence Panels — repositioned for no overlap */}
        <div className="hero-floating-panels">
          {FLOATING_PANELS.map((panel, i) => (
            <motion.div
              key={panel.label}
              className={`floating-panel fp-pos-${i}`}
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="floating-panel-header">
                <panel.icon size={13} style={{ color: panel.color, flexShrink: 0 }} />
                <span className="floating-panel-label">{panel.label}</span>
              </div>
              <div className="floating-panel-value">
                <span className="floating-panel-dot" style={{ background: panel.color, boxShadow: `0 0 8px ${panel.color}` }} />
                {panel.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Layer 5: AI Activity Feed — repositioned below hero content area */}
        <div className="hero-ai-feed">
          <div className="ai-feed-header">
            <div className="ai-feed-header-dot" />
            <span>AI Activity</span>
          </div>
          <AnimatePresence mode="popLayout">
            {visibleFeed.map((item, i) => (
              <motion.div
                key={`${feedIndex}-${i}`}
                className="ai-feed-item"
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -15, scale: 0.95 }}
                transition={{ delay: i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <item.icon size={12} className="ai-feed-icon" style={{ color: item.type === 'success' ? '#34D399' : item.type === 'warning' ? '#FBBF24' : item.type === 'danger' ? '#F87171' : '#60A5FA' }} />
                <span>{item.text}</span>
                {item.type === 'success' && <CheckCircle size={10} style={{ color: '#34D399', marginLeft: 'auto', flexShrink: 0 }} />}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Layer 6: Hero Content — centered with stagger */}
        <motion.div
          className="landing-hero-content"
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="badge badge-accent"
            style={{ marginBottom: '1rem' }}
            variants={heroChildVariants}
          >
            <CheckCircle size={12} /> Enterprise-Grade Railway Intelligence
          </motion.div>
          <motion.h1 variants={heroChildVariants}>
            AI-Powered <span className="gradient-text">Railway Infrastructure</span><br />
            Monitoring & Risk Mitigation
          </motion.h1>
          <motion.p variants={heroChildVariants}>
            Vanguard ARC autonomously monitors railway assets, predicts failures, enforces compliance,
            and executes mitigation actions — keeping millions safe across the rail network.
          </motion.p>
          <motion.div className="landing-hero-actions" variants={heroChildVariants}>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link to="/login" className="btn btn-primary btn-lg">
                Access Platform <ArrowRight size={16} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link to="/features" className="btn btn-secondary btn-lg">
                Explore Features
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Layer 7: Stats bar */}
        <div className="landing-stats">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              className="landing-stat"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + i * 0.15, duration: 0.5 }}
            >
              <div className="landing-stat-value">{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ────── FEATURES SECTION ────── */}
      <section className="landing-features">
        <div className="landing-features-inner">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="gradient-text">Comprehensive Railway Intelligence</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Purpose-built modules for every aspect of railway infrastructure monitoring and autonomous risk mitigation.
          </motion.p>
          <motion.div
            className="landing-feature-grid"
            variants={featureContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-100px" }}
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="landing-feature-card"
                variants={featureCardVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="landing-feature-icon">
                  <f.icon size={24} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ────── CTA SECTION ────── */}
      <section className="landing-cta-section">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Ready to Transform Railway Operations?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          Join India's leading railway operators using Vanguard ARC to ensure safety, compliance, and operational excellence.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          <Link to="/register" className="btn btn-primary btn-lg">
            Get Started Now <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
