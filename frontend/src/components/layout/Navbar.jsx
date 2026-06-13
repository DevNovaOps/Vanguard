import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSimulation } from '../../contexts/SimulationContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Sun, Moon, Monitor, Menu, Search, Play, Square,
  ChevronRight, LogOut, User, AlertOctagon, AlertTriangle, Info, CheckCircle
} from 'lucide-react';
import { useState } from 'react';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/railway-network': 'Railway Network',
  '/telemetry': 'Telemetry Center',
  '/infrastructure': 'Infrastructure Database',
  '/risk-analysis': 'Risk Analysis Engine',
  '/compliance': 'Compliance Center',
  '/incidents': 'Incident Management',
  '/autonomous-agent': 'Autonomous Agent',
  '/mitigation': 'Mitigation Center',
  '/audit-logs': 'Audit Logs',
  '/webhooks': 'Webhook Center',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function Navbar({ sidebarCollapsed, onMobileMenuOpen }) {
  const { user, logout, getRoleInfo } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isRunning, startSimulation, stopSimulation, currentStep, totalSteps } = useSimulation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getDropdownIcon = (type, severity) => {
    const size = 16;
    if (severity === 'Critical') {
      return <AlertOctagon size={size} style={{ color: 'var(--color-danger)' }} />;
    }
    if (severity === 'High') {
      return <AlertTriangle size={size} style={{ color: 'var(--color-warning)' }} />;
    }
    if (type?.includes('Simulation')) {
      return <Play size={size} style={{ color: 'var(--color-primary-400)' }} />;
    }
    if (type?.includes('Mitigation')) {
      return <CheckCircle size={size} style={{ color: 'var(--color-success)' }} />;
    }
    return <Info size={size} style={{ color: 'var(--color-primary-400)' }} />;
  };

  const roleInfo = getRoleInfo();
  const basePath = '/' + location.pathname.split('/').filter(Boolean)[0];
  const pageTitle = PAGE_TITLES[basePath] || 'Dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSimulationClick = () => {
    if (isRunning) {
      stopSimulation();
    } else {
      startSimulation();
      navigate('/simulation');
    }
  };

  return (
    <nav className={`navbar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="navbar-left">
        <button className="btn btn-ghost btn-icon mobile-menu-btn" onClick={onMobileMenuOpen}>
          <Menu size={20} />
        </button>
        <div className="navbar-breadcrumbs">
          <a href="/dashboard">Home</a>
          <ChevronRight size={12} />
          <span className="current">{pageTitle}</span>
        </div>
      </div>

      <div className="navbar-right">
        {/* Simulation Button — Cinematic */}
        <motion.button
          className={`navbar-simulation-btn ${isRunning ? 'running' : ''}`}
          onClick={handleSimulationClick}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {isRunning ? <Square size={14} /> : <Play size={14} />}
          <span>{isRunning ? `STEP ${currentStep}/${totalSteps}` : 'RUN FAILURE SIMULATION'}</span>
        </motion.button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <motion.button
            className={`btn btn-ghost btn-icon navbar-notification-btn ${showNotifications ? 'active' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-dot" />
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '12px',
                  background: 'var(--surface-card)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-xl), var(--glow-subtle)',
                  width: '360px',
                  zIndex: 'var(--z-dropdown)',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                    Notifications {unreadCount > 0 && `(${unreadCount})`}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => { markAllAsRead(); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary-400)',
                        fontSize: '11px',
                        fontWeight: 'var(--font-medium)',
                        cursor: 'pointer',
                      }}
                      onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notifications list */}
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 10).map(notif => {
                      return (
                        <div
                          key={notif.notificationId || notif._id}
                          onClick={() => {
                            markAsRead(notif.notificationId || notif._id);
                            // Navigate to module path
                            const pathMap = {
                              Compliance: '/compliance',
                              Risk: '/risk-analysis',
                              Incident: '/incidents',
                              AutonomousAgent: '/autonomous-agent',
                              Mitigation: '/mitigation',
                              Simulation: '/simulation'
                            };
                            if (pathMap[notif.module]) {
                              navigate(pathMap[notif.module]);
                            }
                            setShowNotifications(false);
                          }}
                          style={{
                            padding: '0.875rem 1rem',
                            borderBottom: '1px solid var(--border-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'flex-start',
                            background: notif.isRead ? 'transparent' : 'rgba(255, 255, 255, 0.03)',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseOut={(e) => e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(255, 255, 255, 0.03)'}
                        >
                          <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getDropdownIcon(notif.type, notif.severity)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: notif.isRead ? 'var(--font-medium)' : 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                                {notif.title}
                              </span>
                              {!notif.isRead && (
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-danger)' }} />
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                              {notif.message}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Switcher */}
        <div className="theme-switcher">
          <button
            className={theme === 'light' ? 'active' : ''}
            onClick={() => setTheme('light')}
            title="Light"
          >
            <Sun size={14} />
          </button>
          <button
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => setTheme('dark')}
            title="Dark"
          >
            <Moon size={14} />
          </button>
          <button
            className={theme === 'system' ? 'active' : ''}
            onClick={() => setTheme('system')}
            title="System"
          >
            <Monitor size={14} />
          </button>
        </div>

        {/* User Menu */}
        <div className="user-menu" onClick={() => setShowUserMenu(!showUserMenu)} style={{ position: 'relative' }}>
          <motion.div
            className="user-avatar"
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            {user?.name?.charAt(0) || 'U'}
          </motion.div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-role">{roleInfo?.label || 'Unknown'}</span>
          </div>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: 'var(--surface-card)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-xl), var(--glow-subtle)',
                  minWidth: '200px',
                  zIndex: 'var(--z-dropdown)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-secondary)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{user?.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{user?.email}</div>
                </div>
                <div style={{ padding: '0.25rem' }}>
                  <button
                    className="nav-item"
                    onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                    style={{ width: '100%' }}
                  >
                    <User size={16} /> <span>Profile</span>
                  </button>
                  <button className="nav-item" onClick={handleLogout} style={{ width: '100%', color: 'var(--color-danger)' }}>
                    <LogOut size={16} /> <span>Logout</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
