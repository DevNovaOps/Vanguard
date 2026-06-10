import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { UserPlus, Shield, Radio, Bot, Activity, Lock, Mail, User, CheckCircle } from 'lucide-react';
import VanguardARCIcon from '../../components/common/VanguardARCIcon';

const AUTH_STATS = [
  { value: '284', label: 'Active Sensors', color: '#60A5FA' },
  { value: '99.97%', label: 'Uptime', color: '#34D399' },
  { value: '156', label: 'Auto Actions', color: '#A78BFA' },
];

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

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState('operator');
  const [focusedField, setFocusedField] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Railway Operations');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await register(name, email, password, selectedRole, department);
      if (user && !user.isActive) {
        setSuccess(true);
      } else {
        const roleRoutes = {
          admin: '/dashboard/admin',
          operator: '/dashboard/operator',
          safety_officer: '/dashboard/safety',
          manager: '/dashboard/manager',
        };
        navigate(roleRoutes[user?.role] || '/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check inputs.');
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        {/* ── Full-Screen Animated Background ── */}
        <div className="auth-bg-network">
          <svg width="100%" height="100%" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid slice">
            <defs>
              <filter id="authGlow2">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <radialGradient id="authVignette2" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(2,6,23,0.5)" />
              </radialGradient>
            </defs>

            <rect width="900" height="520" fill="url(#authVignette2)" />

            {AUTH_PARTICLES.map(p => (
              <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r} fill="rgba(45,212,191,0.25)">
                <animate attributeName="opacity" values="0;0.5;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
                <animate attributeName="cy" values={`${p.cy};${p.cy - 15};${p.cy}`} dur={`${p.dur * 1.3}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </svg>
        </div>

        <motion.div
          className="auth-card"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '3rem 2rem' }}
        >
          <div className="auth-card-glow" />
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <CheckCircle size={80} style={{ color: '#34D399' }} />
          </div>
          <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Registration Request Sent!</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6', fontSize: 'var(--text-sm)' }}>
            Your request to join as an <strong style={{ color: 'var(--text-primary)' }}>{selectedRole.replace('_', ' ').toUpperCase()}</strong> has been submitted successfully.
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            textAlign: 'left',
            marginBottom: '2rem',
            lineHeight: '1.5'
          }}>
            <p style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>💡 <strong>Account Status: Pending Approval</strong></p>
            <p style={{ margin: 0 }}>To secure the industrial transit network, all new operator and management accounts require review. An administrator will verify your credentials shortly. You will be able to log in once your status becomes active.</p>
          </div>
          <Link to="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', width: '100%', color: 'white' }}>
            Return to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* ── Full-Screen Animated Background ── */}
      <div className="auth-bg-network">
        <svg width="100%" height="100%" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="authGlow2">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="authVignette2" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(2,6,23,0.5)" />
            </radialGradient>
          </defs>

          <rect width="900" height="520" fill="url(#authVignette2)" />

          {AUTH_PARTICLES.map(p => (
            <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r} fill="rgba(45,212,191,0.25)">
              <animate attributeName="opacity" values="0;0.5;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
              <animate attributeName="cy" values={`${p.cy};${p.cy - 15};${p.cy}`} dur={`${p.dur * 1.3}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {AUTH_ROUTES.map(([a, b], i) => {
            const from = AUTH_NODES[a];
            const to = AUTH_NODES[b];
            if (!from || !to) return null;
            const routeId = `reg-route-${i}`;
            return (
              <g key={routeId}>
                <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
                  stroke="rgba(45,212,191,0.07)" strokeWidth="1.5" />
                <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
                  stroke="rgba(45,212,191,0.18)" strokeWidth="0.7" strokeDasharray="3 6"
                  style={{ animation: `flowDash ${3 + (i % 4) * 0.5}s linear infinite` }}
                />
                {i % 3 === 0 && (
                  <>
                    <path id={routeId} d={`M${from.cx},${from.cy} L${to.cx},${to.cy}`} fill="none" />
                    <circle r="1.5" fill="#2DD4BF" filter="url(#authGlow2)" opacity="0.8">
                      <animateMotion dur={`${4 + (i % 3)}s`} repeatCount="indefinite" begin={`${(i * 0.5) % 4}s`}>
                        <mpath xlinkHref={`#${routeId}`} />
                      </animateMotion>
                    </circle>
                  </>
                )}
              </g>
            );
          })}

          {AUTH_NODES.map((node, i) => (
            <g key={`reg-node-${i}`}>
              <circle cx={node.cx} cy={node.cy} r={i % 4 === 0 ? 4 : 2.5}
                fill={i % 5 === 0 ? '#2DD4BF' : i % 5 === 1 ? '#60A5FA' : i % 5 === 2 ? '#A78BFA' : i % 5 === 3 ? '#FBBF24' : '#F87171'}
                opacity="0.5" style={{ filter: 'drop-shadow(0 0 3px rgba(45,212,191,0.3))' }}
              />
              <circle cx={node.cx} cy={node.cy} r={i % 4 === 0 ? 8 : 5} fill="none"
                stroke={i % 5 === 0 ? '#2DD4BF' : '#60A5FA'} strokeWidth="0.5" opacity="0.15"
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
        <div className="auth-card-glow" />

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <motion.div
            className="auth-logo-icon"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <VanguardARCIcon size={72} />
          </motion.div>
          <h1>Create Account</h1>
          <p className="auth-subtitle">Join the Vanguard ARC Platform</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className={`input-group auth-input-group ${focusedField === 'name' ? 'focused' : ''}`}>
            <label><User size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Full Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div className={`input-group auth-input-group ${focusedField === 'email' ? 'focused' : ''}`}>
            <label><Mail size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div className={`input-group auth-input-group ${focusedField === 'password' ? 'focused' : ''}`}>
            <label><Lock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div className={`input-group auth-input-group ${focusedField === 'department' ? 'focused' : ''}`}>
            <label><Bot size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Department</label>
            <input
              className="input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Railway Operations"
              onFocus={() => setFocusedField('department')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="role-select">Select Role</label>
            <select
              id="role-select"
              className="select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="operator" style={{ background: '#0F121E', color: 'var(--text-primary)' }}>Operator (Operations monitoring)</option>
              <option value="safety_officer" style={{ background: '#0F121E', color: 'var(--text-primary)' }}>Safety Officer (Compliance & risk)</option>
              <option value="manager" style={{ background: '#0F121E', color: 'var(--text-primary)' }}>Manager (Analytics & reports)</option>
            </select>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-sm)',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            className="btn btn-primary btn-lg auth-submit-btn"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <UserPlus size={16} /> Create Account
          </motion.button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </motion.div>
    </div>
  );
}
