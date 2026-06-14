import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle, ArrowRight, Shield, AlertTriangle, Key, ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';
import VanguardARCIcon from '../../components/common/VanguardARCIcon';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '../../utils/authService';

const emailSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address')
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

export default function ForgotPasswordPage() {
  const { loginWithOtp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState('enter_email'); // enter_email, choose_option, reset_sent, enter_otp
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300);
  const [focusedField, setFocusedField] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [otpStatus, setOtpStatus] = useState('idle'); // idle, error, success
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [optionLoading, setOptionLoading] = useState(null);

  const otpRefs = useRef([]);

  // Setup form validation for email
  const { register: registerField, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(emailSchema)
  });

  // Handle OTP countdown timer
  useEffect(() => {
    if (step !== 'enter_otp' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Handle Email Submission (Step 1)
  const onEmailSubmit = async (data) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await authService.forgotPassword(data.email);
      if (res.success) {
        setEmail(data.email);
        setStep('choose_option');
      }
    } catch (err) {
      setApiError(err.message || 'Verification failed. Account does not exist or is inactive.');
    } finally {
      setLoading(false);
    }
  };

  // Option 1: Generate reset token and email reset link
  const handleChooseChangePassword = async () => {
    setLoading(true);
    setOptionLoading('change_password');
    setApiError(null);
    try {
      const res = await authService.sendResetLink(email);
      if (res.success) {
        setStep('reset_sent');
      }
    } catch (err) {
      setApiError(err.message || 'Failed to generate password reset token.');
    } finally {
      setLoading(false);
      setOptionLoading(null);
    }
  };

  // Option 2: Generate 6-digit OTP code and send email
  const handleChooseContinueWithoutChange = async () => {
    setLoading(true);
    setOptionLoading('bypass_password');
    setApiError(null);
    try {
      const res = await authService.sendLoginOtp(email);
      if (res.success) {
        setOtp(['', '', '', '', '', '']);
        setTimeLeft(300);
        setOtpStatus('idle');
        setStep('enter_otp');
        // Auto-focus first input box
        setTimeout(() => {
          if (otpRefs.current[0]) otpRefs.current[0].focus();
        }, 150);
      }
    } catch (err) {
      setApiError(err.message || 'Failed to dispatch security code.');
    } finally {
      setLoading(false);
      setOptionLoading(null);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await authService.resendOtp(email);
      if (res.success) {
        setOtp(['', '', '', '', '', '']);
        setTimeLeft(300);
        setOtpStatus('idle');
        setApiError(null);
        setTimeout(() => {
          if (otpRefs.current[0]) otpRefs.current[0].focus();
        }, 150);
      }
    } catch (err) {
      setApiError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle single character OTP entry
  const handleOtpChange = (val, idx) => {
    const digit = val.replace(/\D/g, '');
    if (!digit) {
      const newOtp = [...otp];
      newOtp[idx] = '';
      setOtp(newOtp);
      return;
    }

    const newOtp = [...otp];
    newOtp[idx] = digit[digit.length - 1];
    setOtp(newOtp);

    // Auto move to next input box
    if (idx < 5) {
      otpRefs.current[idx + 1].focus();
    }
  };

  // Keyboard navigation support
  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      if (otp[idx] === '') {
        if (idx > 0) {
          newOtp[idx - 1] = '';
          setOtp(newOtp);
          otpRefs.current[idx - 1].focus();
        }
      } else {
        newOtp[idx] = '';
        setOtp(newOtp);
      }
    }
  };

  // Clipboard paste support
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }
    setOtp(newOtp);

    const targetIdx = Math.min(pasteData.length, 5);
    if (otpRefs.current[targetIdx]) {
      otpRefs.current[targetIdx].focus();
    }
  };

  // Trigger OTP authentication on backend
  const handleOtpVerify = async (e) => {
    e?.preventDefault();
    setApiError(null);
    const otpCode = otp.join('');

    if (otpCode.length < 6) {
      setApiError('Please fill in all 6 verification digits.');
      setShake(true);
      setOtpStatus('error');
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    try {
      const user = await loginWithOtp(email, otpCode);
      setOtpStatus('success');
      setSuccessAnimation(true);

      // Cyber Shield Opens / Progress Ring Completes delay animation before redirecting
      setTimeout(() => {
        const roleRoutes = {
          admin: '/dashboard/admin',
          operator: '/dashboard/operator',
          safety_officer: '/dashboard/safety',
          manager: '/dashboard/manager',
        };
        navigate(roleRoutes[user.role] || '/dashboard');
      }, 600);
    } catch (err) {
      setOtpStatus('error');
      setShake(true);
      setApiError(err.message || 'Invalid verification code.');
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Variants for Framer Motion entrance animations
  const pageTransition = {
    initial: { opacity: 0, scale: 0.95, filter: 'blur(8px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 0.95, filter: 'blur(8px)' }
  };

  const shakeVariants = {
    shake: {
      x: [0, -10, 10, -10, 10, -5, 5, 0],
      transition: { duration: 0.5 }
    },
    idle: { x: 0 }
  };

  return (
    <div className="auth-page">
      {/* ── Full-Screen Animated Network Background ── */}
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

          {/* Connection lines */}
          {AUTH_ROUTES.map(([a, b], i) => {
            const from = AUTH_NODES[a];
            const to = AUTH_NODES[b];
            if (!from || !to) return null;
            const routeId = `auth-route-${i}`;
            return (
              <g key={routeId}>
                <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy} stroke="rgba(96,165,250,0.08)" strokeWidth="1.5" />
                <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy} stroke="rgba(96,165,250,0.2)" strokeWidth="0.7" strokeDasharray="3 6" style={{ animation: `flowDash ${3 + (i % 4) * 0.5}s linear infinite` }} />
                {i % 3 === 0 && (
                  <>
                    <path id={routeId} d={`M${from.cx},${from.cy} L${to.cx},${to.cy}`} fill="none" />
                    <circle r="1.5" fill="#60a5fa" filter="url(#authGlow)" opacity="0.8">
                      <animateMotion dur={`${4 + (i % 3)}s`} repeatCount="indefinite" begin={`${(i * 0.5) % 4}s`}>
                        <mpath xlinkHref={`#${routeId}`} />
                      </animateMotion>
                    </circle>
                  </>
                )}
              </g>
            );
          })}

          {/* Ambient particles */}
          {AUTH_PARTICLES.map(p => (
            <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r} fill="rgba(96,165,250,0.25)">
              <animate attributeName="opacity" values="0;0.5;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
              <animate attributeName="cy" values={`${p.cy};${p.cy - 15};${p.cy}`} dur={`${p.dur * 1.3}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Nodes */}
          {AUTH_NODES.map((node, i) => (
            <g key={`auth-node-${i}`}>
              <circle cx={node.cx} cy={node.cy} r={i % 4 === 0 ? 4 : 2.5} fill={i % 5 === 0 ? '#60A5FA' : i % 5 === 1 ? '#2DD4BF' : i % 5 === 2 ? '#A78BFA' : i % 5 === 3 ? '#FBBF24' : '#F87171'} opacity="0.5" style={{ filter: 'drop-shadow(0 0 3px rgba(96,165,250,0.3))' }} />
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
            transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
          >
            <span className="auth-stat-dot" style={{ background: stat.color, boxShadow: `0 0 6px ${stat.color}` }} />
            <span className="auth-stat-value">{stat.value}</span>
            <span className="auth-stat-label">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Main Auth Card ── */}
      <motion.div
        className="auth-card"
        variants={shakeVariants}
        animate={shake ? 'shake' : 'idle'}
        initial="initial"
        {...pageTransition}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-card-glow" />

        <AnimatePresence mode="wait">
          {/* STEP 1: Email Request Entry */}
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
                  whileHover={{ scale: 1.05 }}
                >
                  <VanguardARCIcon size={72} />
                </motion.div>
                <h1>Reset Password</h1>
                <p className="auth-subtitle">Enter your email to configure system access</p>
              </div>

              <form className="auth-form" onSubmit={handleSubmit(onEmailSubmit)}>
                <div className={`input-group auth-input-group ${focusedField === 'email' ? 'focused' : ''}`}>
                  <label>
                    <Mail size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Email Address
                  </label>
                  <input
                    {...registerField('email')}
                    className={`input ${errors.email ? 'error' : ''}`}
                    type="email"
                    placeholder="you@company.com"
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {errors.email && (
                    <span style={{ color: 'var(--color-danger)', fontSize: '10px', marginTop: '2px', display: 'block' }}>
                      {errors.email.message}
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
                  {loading ? 'Verifying...' : 'Continue'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* STEP 2: Security Options Select */}
          {step === 'choose_option' && (
            <motion.div
              key="choose_option"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div className="shield-glow-container">
                  <Shield size={64} className="shield-glow-icon" />
                </div>
                <h1>Security Options</h1>
                <p className="auth-subtitle">Select how you wish to proceed for verification</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
                <button
                  onClick={handleChooseChangePassword}
                  className="option-card-btn"
                  disabled={loading}
                >
                  <div className="icon-box">
                    {optionLoading === 'change_password' ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      <Key size={20} />
                    )}
                  </div>
                  <div>
                    <h3>Change Password</h3>
                    <p>{optionLoading === 'change_password' ? 'Generating reset instruction...' : 'Request a secure password reset link via email'}</p>
                  </div>
                </button>

                <button
                  onClick={handleChooseContinueWithoutChange}
                  className="option-card-btn"
                  disabled={loading}
                >
                  <div className="icon-box">
                    {optionLoading === 'bypass_password' ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={20} />
                    )}
                  </div>
                  <div>
                    <h3>Bypass Password</h3>
                    <p>{optionLoading === 'bypass_password' ? 'Dispatching security code...' : 'Login directly using a 6-digit OTP code'}</p>
                  </div>
                </button>
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
                  marginBottom: '1rem'
                }}>
                  <ShieldAlert size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  {apiError}
                </div>
              )}
            </motion.div>
          )}

          {/* OPTION 1 SUB-STEP: Reset Email Sent */}
          {step === 'reset_sent' && (
            <motion.div
              key="reset_sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              style={{ textAlign: 'center', padding: '1rem 0' }}
            >
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <CheckCircle size={72} style={{ color: '#34D399', filter: 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.4))' }} />
              </div>
              <h1 style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>Reset Link Dispatched</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6', fontSize: 'var(--text-xs)' }}>
                A password config instruction link has been sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Check your inbox and complete password reset.
              </p>
              <Link to="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', width: '100%', color: 'white', height: '36px', fontSize: 'var(--text-xs)' }}>
                Return to Login <ArrowRight size={14} />
              </Link>
            </motion.div>
          )}

          {/* OPTION 2 SUB-STEP: OTP Code Verification */}
          {step === 'enter_otp' && (
            <motion.div
              key="enter_otp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div className="shield-glow-container">
                  <AnimatePresence mode="wait">
                    {successAnimation ? (
                      <motion.div
                        key="success-shield"
                        initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', damping: 12 }}
                      >
                        <ShieldCheck size={64} style={{ color: '#34D399', filter: 'drop-shadow(0 0 12px rgba(52, 211, 153, 0.6))' }} />
                      </motion.div>
                    ) : (
                      <Shield size={64} className="shield-glow-icon" />
                    )}
                  </AnimatePresence>
                </div>
                <h1>{successAnimation ? 'Access Granted' : 'Security Verification'}</h1>
                <p className="auth-subtitle">
                  {successAnimation ? 'Authentication successful. Loading terminal...' : 'Enter the 6-digit verification code sent to your email'}
                </p>
              </div>

              {!successAnimation && (
                <form className="auth-form" onSubmit={handleOtpVerify}>
                  <div className="otp-container" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => (otpRefs.current[idx] = el)}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(e.target.value, idx)}
                        onKeyDown={e => handleOtpKeyDown(e, idx)}
                        className={`otp-box ${otpStatus === 'error' ? 'error' : otpStatus === 'success' ? 'success' : ''}`}
                      />
                    ))}
                  </div>

                  {/* Countdown Timer */}
                  <div className="timer-text">
                    {timeLeft > 0 ? (
                      <span>Code expires in: <span className="timer-highlight">{formatTime(timeLeft)}</span></span>
                    ) : (
                      <span className="timer-expired">Code Expired</span>
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
                      marginBottom: '1rem'
                    }}>
                      <ShieldAlert size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      {apiError}
                    </div>
                  )}

                  {timeLeft > 0 ? (
                    <motion.button
                      type="submit"
                      className="btn btn-primary btn-lg auth-submit-btn"
                      disabled={loading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {loading ? 'Verifying...' : 'Verify & Sign In'}
                    </motion.button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="btn btn-secondary btn-lg"
                      disabled={loading}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '36px', fontSize: 'var(--text-xs)', width: '100%' }}
                    >
                      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                      Resend Code
                    </button>
                  )}
                </form>
              )}
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
