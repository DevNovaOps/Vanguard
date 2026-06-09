import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Shield, Radio, Bot, Activity, Zap, Eye, Users, Lock, Mail, CheckCircle } from 'lucide-react';
import VanguardARCIcon from '../../components/common/VanguardARCIcon';

const ROLES = [
  { id: 'admin', title: 'Admin', desc: 'Full platform access', icon: Shield, color: '#60A5FA' },
  { id: 'operator', title: 'Operator', desc: 'Operations monitoring', icon: Radio, color: '#34D399' },
  { id: 'safety_officer', title: 'Safety Officer', desc: 'Compliance & risk', icon: Activity, color: '#FBBF24' },
  { id: 'manager', title: 'Manager', desc: 'Analytics & reports', icon: Bot, color: '#A78BFA' },
];

const AUTH_STATS = [
  { value: '284', label: 'Active Sensors', color: '#60A5FA' },
  { value: '99.97%', label: 'Uptime', color: '#34D399' },
  { value: '156', label: 'Auto Actions', color: '#A78BFA' },
];

/* Auth network nodes and routes */
const AUTH_NODES = [
  { cx: 80, cy: 100 }, { cx: 200, cy: 60 }, { cx: 340, cy: 120 },
  { cx: 480, cy: 50 }, { cx: 600, cy: 110 }, { cx: 720, cy: 70 },
  { cx: 140, cy: 220 }, { cx: 300, cy: 260 }, { cx: 460, cy: 200 },
  { cx: 580, cy: 270 }, { cx: 700, cy: 210 }, { cx: 820, cy: 160 },
  { cx: 100, cy: 350 }, { cx: 250, cy: 380 }, { cx: 420, cy: 340 },
  { cx: 560, cy: 390 }, { cx: 680, cy: 330 }, { cx: 800, cy: 280 },
  { cx: 160, cy: 460 }, { cx: 380, cy: 440 }, { cx: 520, cy: 480 },
  { cx: 660, cy: 420 }, { cx: 770, cy: 470 },
];

const AUTH_ROUTES = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[0,6],[6,7],[7,8],[8,9],[9,10],[10,11],
  [6,12],[12,13],[13,14],[14,15],[15,16],[16,17],[1,7],[3,8],[5,11],
  [7,13],[9,15],[12,18],[13,19],[14,20],[15,21],[16,22],[18,19],[19,20],[20,21],[21,22],
];

const AUTH_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  cx: Math.random() * 850 + 25,
  cy: Math.random() * 480 + 20,
  r: Math.random() * 1.2 + 0.4,
  dur: Math.random() * 5 + 4,
  delay: Math.random() * 4,
}));

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = login(selectedRole);
    const roleRoutes = {
      admin: '/dashboard/admin',
      operator: '/dashboard/operator',
      safety_officer: '/dashboard/safety',
      manager: '/dashboard/manager',
    };
    navigate(roleRoutes[user.role] || '/dashboard');
  };

  return (
    <div className="auth-page">
      {/* ── Full-Screen Animated Background ── */}
      <div className="auth-bg-network">
        <svg width="100%" height="100%" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="authGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="authVignette" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(2,6,23,0.5)" />
            </radialGradient>
          </defs>

          {/* Vignette overlay */}
          <rect width="900" height="520" fill="url(#authVignette)" />

          {/* Ambient particles */}
          {AUTH_PARTICLES.map(p => (
            <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r} fill="rgba(96,165,250,0.25)">
              <animate attributeName="opacity" values="0;0.5;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
              <animate attributeName="cy" values={`${p.cy};${p.cy - 15};${p.cy}`} dur={`${p.dur * 1.3}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Connection lines */}
          {AUTH_ROUTES.map(([a, b], i) => {
            const from = AUTH_NODES[a];
            const to = AUTH_NODES[b];
            if (!from || !to) return null;
            const routeId = `auth-route-${i}`;
            return (
              <g key={routeId}>
                <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
                  stroke="rgba(96,165,250,0.08)" strokeWidth="1.5" />
                <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
                  stroke="rgba(96,165,250,0.2)" strokeWidth="0.7" strokeDasharray="3 6"
                  style={{ animation: `flowDash ${3 + (i % 4) * 0.5}s linear infinite` }}
                />
                {/* Data packet every 3rd route */}
                {i % 3 === 0 && (
                  <>
                    <path id={routeId} d={`M${from.cx},${from.cy} L${to.cx},${to.cy}`} fill="none" />
                    <circle r="1.5" fill="#60A5FA" filter="url(#authGlow)" opacity="0.8">
                      <animateMotion dur={`${4 + (i % 3)}s`} repeatCount="indefinite" begin={`${(i * 0.5) % 4}s`}>
                        <mpath xlinkHref={`#${routeId}`} />
                      </animateMotion>
                    </circle>
                  </>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {AUTH_NODES.map((node, i) => (
            <g key={`auth-node-${i}`}>
              <circle cx={node.cx} cy={node.cy} r={i % 4 === 0 ? 4 : 2.5}
                fill={i % 5 === 0 ? '#60A5FA' : i % 5 === 1 ? '#2DD4BF' : i % 5 === 2 ? '#A78BFA' : i % 5 === 3 ? '#FBBF24' : '#F87171'}
                opacity="0.5" style={{ filter: 'drop-shadow(0 0 3px rgba(96,165,250,0.3))' }}
              />
              <circle cx={node.cx} cy={node.cy} r={i % 4 === 0 ? 8 : 5} fill="none"
                stroke={i % 5 === 0 ? '#60A5FA' : '#2DD4BF'} strokeWidth="0.5" opacity="0.15"
              >
                <animate attributeName="r" values={`${i % 4 === 0 ? 6 : 4};${i % 4 === 0 ? 12 : 8};${i % 4 === 0 ? 6 : 4}`} dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.05;0.2" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}
        </svg>
      </div>

      {/* ── Floating Stat Panels ── */}
      <div className="auth-floating-stats">
        {AUTH_STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            className={`auth-stat-pill auth-stat-pill-${i}`}
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="auth-stat-dot" style={{ background: stat.color, boxShadow: `0 0 6px ${stat.color}` }} />
            <span className="auth-stat-value">{stat.value}</span>
            <span className="auth-stat-label">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Auth Card ── */}
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Card glow accent */}
        <div className="auth-card-glow" />

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <motion.div
            className="auth-logo-icon"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <VanguardARCIcon size={72} />
          </motion.div>
          <h1>Welcome Back</h1>
          <p className="auth-subtitle">Sign in to Vanguard ARC Platform</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Role Selection */}
          <div className="input-group">
            <label>Select Role (Demo)</label>
            <div className="role-selector">
              {ROLES.map((role, i) => (
                <motion.div
                  key={role.id}
                  className={`role-option ${selectedRole === role.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRole(role.id)}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <role.icon size={16} style={{ color: role.color, marginBottom: '4px' }} />
                  <div className="role-option-title">{role.title}</div>
                  <div className="role-option-desc">{role.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Email */}
          <div className={`input-group auth-input-group ${focusedField === 'email' ? 'focused' : ''}`}>
            <label><Mail size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vanguardarc.in"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {/* Password */}
          <div className={`input-group auth-input-group ${focusedField === 'password' ? 'focused' : ''}`}>
            <label><Lock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary btn-lg auth-submit-btn"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <LogIn size={16} /> Sign In
          </motion.button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </motion.div>
    </div>
  );
}
