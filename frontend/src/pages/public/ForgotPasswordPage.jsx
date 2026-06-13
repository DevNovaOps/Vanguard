import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle, ArrowRight, Key, Shield, AlertTriangle } from 'lucide-react';
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

export default function ForgotPasswordPage() {
  const { loginWithOtp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState('enter_email'); // enter_email, choose_option, reset_sent, enter_otp
  const [otpCode, setOtpCode] = useState('');
  const [userInputOtp, setUserInputOtp] = useState('');
  const [simulatedOtpSentMessage, setSimulatedOtpSentMessage] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Email address is required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setStep('choose_option');
  };

  const handleChooseChangePassword = () => {
    // Option A: Send reset link
    setStep('reset_sent');
  };

  const handleChooseContinueWithoutChange = () => {
    // Option B: Generate OTP and send code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(generatedCode);
    setSimulatedOtpSentMessage(`[Vanguard Security] Verification code sent to ${email}: ${generatedCode}`);
    setStep('enter_otp');
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setError(null);

    if (!userInputOtp) {
      setError('Please enter the verification code.');
      return;
    }

    if (userInputOtp !== otpCode) {
      setError('Invalid 6-digit code. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // Direct login call to our new backend route
      const user = await loginWithOtp(email);
      const roleRoutes = {
        admin: '/dashboard/admin',
        operator: '/dashboard/operator',
        safety_officer: '/dashboard/safety',
        manager: '/dashboard/manager',
      };
      navigate(roleRoutes[user.role] || '/dashboard');
    } catch (err) {
      setError(err.message || 'OTP authentication failed. No user matches this email.');
    } finally {
      setLoading(false);
    }
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
        <div className="auth-card-glow" />

        <AnimatePresence mode="wait">
          {step === 'enter_email' && (
            <motion.div
              key="enter_email"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <motion.div
                  className="auth-logo-icon"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <VanguardARCIcon size={72} />
                </motion.div>
                <h1>Reset Password</h1>
                <p className="auth-subtitle">Enter your email to configure system access</p>
              </div>

              <form className="auth-form" onSubmit={handleEmailSubmit}>
                <div className={`input-group auth-input-group ${focusedField === 'email' ? 'focused' : ''}`}>
                  <label><Mail size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Email Address</label>
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
                  Continue
                </motion.button>
              </form>
            </motion.div>
          )}

          {step === 'choose_option' && (
            <motion.div
              key="choose_option"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <motion.div
                  className="auth-logo-icon"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <VanguardARCIcon size={72} />
                </motion.div>
                <h1>Security Options</h1>
                <p className="auth-subtitle" style={{ color: 'var(--text-primary)' }}>Select how you wish to proceed for <br /><strong>{email}</strong></p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <motion.button
                  onClick={handleChooseChangePassword}
                  className="btn btn-primary btn-lg auth-submit-btn"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Change Password
                </motion.button>

                <motion.button
                  onClick={handleChooseContinueWithoutChange}
                  className="btn btn-secondary btn-lg"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Continue without Changing Password
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 'reset_sent' && (
            <motion.div
              key="reset_sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              style={{ textAlign: 'center', padding: '1.5rem 0' }}
            >
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <CheckCircle size={72} style={{ color: '#34D399' }} />
              </div>
              <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Reset Link Sent!</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6', fontSize: 'var(--text-sm)' }}>
                A password reset instruction link has been sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Please check your inbox.
              </p>
              <Link to="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', width: '100%', color: 'white' }}>
                Return to Login <ArrowRight size={14} />
              </Link>
            </motion.div>
          )}

          {step === 'enter_otp' && (
            <motion.div
              key="enter_otp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <motion.div
                  className="auth-logo-icon"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <VanguardARCIcon size={72} />
                </motion.div>
                <h1>Enter OTP Code</h1>
                <p className="auth-subtitle">Verify your identity to log in directly</p>
              </div>

              {/* Simulated OTP Notification Banner */}
              <div style={{
                background: 'rgba(217, 119, 6, 0.1)',
                border: '1px solid var(--color-warning)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.75rem 1rem',
                fontSize: '11px',
                color: '#FBBF24',
                textAlign: 'left',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                lineHeight: '1.5'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>[Simulated Mail Delivery]</strong><br />
                  {simulatedOtpSentMessage}
                </div>
              </div>

              <form className="auth-form" onSubmit={handleOtpVerify}>
                <div className={`input-group auth-input-group ${focusedField === 'otp' ? 'focused' : ''}`}>
                  <label><Key size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />6-Digit Verification Code</label>
                  <input
                    className="input"
                    type="text"
                    maxLength={6}
                    value={userInputOtp}
                    onChange={(e) => setUserInputOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: 'var(--text-md)' }}
                    onFocus={() => setFocusedField('otp')}
                    onBlur={() => setFocusedField(null)}
                  />
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
                  disabled={loading}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="auth-footer">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </motion.div>
    </div>
  );
}
