import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Key, Eye, EyeOff, ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import VanguardARCIcon from '../../components/common/VanguardARCIcon';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '../../utils/authService';

const resetSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Confirm password is required')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

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

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(resetSchema),
    mode: 'onChange'
  });

  const newPassword = watch('password', '');

  // Calculate password strength rating
  const getStrengthScore = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const score = getStrengthScore(newPassword);

  const getStrengthConfig = (val) => {
    switch (val) {
      case 1:
        return { text: 'Weak Security', color: '#EF4444' };
      case 2:
        return { text: 'Moderate Security', color: '#F97316' };
      case 3:
        return { text: 'Good Security', color: '#F59E0B' };
      case 4:
        return { text: 'Strong Credentials', color: '#10B981' };
      default:
        return { text: 'Unconfigured', color: 'transparent' };
    }
  };

  const config = getStrengthConfig(score);

  // Submit Password update to backend
  const onSubmit = async (data) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await authService.resetPassword(token, data.password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 800);
      }
    } catch (err) {
      setApiError(err.message || 'Verification token is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Background Svg network ── */}
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
          <rect width="900" height="520" fill="url(#authVignette)" />
          {AUTH_ROUTES.map(([a, b], i) => {
            const from = AUTH_NODES[a];
            const to = AUTH_NODES[b];
            if (!from || !to) return null;
            return (
              <g key={`route-${i}`}>
                <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy} stroke="rgba(96,165,250,0.08)" strokeWidth="1.5" />
                <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy} stroke="rgba(96,165,250,0.2)" strokeWidth="0.7" strokeDasharray="3 6" style={{ animation: `flowDash ${3 + (i % 4) * 0.5}s linear infinite` }} />
              </g>
            );
          })}
          {AUTH_PARTICLES.map(p => (
            <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r} fill="rgba(96,165,250,0.25)">
              <animate attributeName="opacity" values="0;0.5;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
              <animate attributeName="cy" values={`${p.cy};${p.cy - 15};${p.cy}`} dur={`${p.dur * 1.3}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </svg>
      </div>

      {/* ── Stats floating panel ── */}
      <div className="auth-floating-stats">
        {AUTH_STATS.map((stat, i) => (
          <div key={stat.label} className={`auth-stat-pill auth-stat-pill-${i}`}>
            <span className="auth-stat-dot" style={{ background: stat.color, boxShadow: `0 0 6px ${stat.color}` }} />
            <span className="auth-stat-value">{stat.value}</span>
            <span className="auth-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* ── Card panel ── */}
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-card-glow" />

        {success ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={72} style={{ color: '#34D399', filter: 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.4))' }} />
            </div>
            <h1 style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>Password Updated!</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6', fontSize: 'var(--text-xs)' }}>
              Your new system access password has been configured successfully. Redirecting you to login console...
            </p>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', width: '100%', color: 'white', height: '36px', fontSize: 'var(--text-xs)' }}>
              Return to Login
            </Link>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <motion.div className="auth-logo-icon" whileHover={{ scale: 1.05 }}>
                <VanguardARCIcon size={72} />
              </motion.div>
              <h1>New Credentials</h1>
              <p className="auth-subtitle">Configure secure access credentials for your account</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
              {/* Field 1: Password */}
              <div className={`input-group auth-input-group ${focusedField === 'password' ? 'focused' : ''}`}>
                <label>
                  <Key size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  New Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className={`input ${errors.password ? 'error' : ''}`}
                    placeholder="••••••••"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.password && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '10px', marginTop: '2px', display: 'block' }}>
                    {errors.password.message}
                  </span>
                )}
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="password-strength-container">
                  <div className="password-strength-bars">
                    {[1, 2, 3, 4].map(idx => (
                      <div
                        key={idx}
                        className="strength-bar"
                        style={{
                          backgroundColor: idx <= score ? config.color : undefined,
                          boxShadow: idx <= score ? `0 0 6px ${config.color}60` : undefined
                        }}
                      />
                    ))}
                  </div>
                  <div className="strength-label">
                    <span>Credential strength:</span>
                    <span style={{ color: config.color, fontWeight: 'bold' }}>{config.text}</span>
                  </div>
                </div>
              )}

              {/* Field 2: Confirm Password */}
              <div className={`input-group auth-input-group ${focusedField === 'confirmPassword' ? 'focused' : ''}`}>
                <label>
                  <Key size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Confirm Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`input ${errors.confirmPassword ? 'error' : ''}`}
                    placeholder="••••••••"
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '10px', marginTop: '2px', display: 'block' }}>
                    {errors.confirmPassword.message}
                  </span>
                )}
              </div>

              {apiError && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '11px',
                  textAlign: 'center',
                  marginBottom: '1rem',
                  marginTop: '0.5rem'
                }}>
                  <ShieldAlert size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  {apiError}
                </div>
              )}

              <motion.button
                type="submit"
                className="btn btn-primary btn-lg auth-submit-btn"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {loading ? 'Configuring...' : 'Reset Password'}
              </motion.button>
            </form>
          </div>
        )}

        <div className="auth-footer">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </motion.div>
    </div>
  );
}
