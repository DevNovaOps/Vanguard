import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSimulation } from '../../contexts/SimulationContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, Monitor, Menu, Search, Play, Square,
  ChevronRight, LogOut, User
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
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

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
      // Navigate to the simulation page so user can configure parameters
      navigate('/simulation');
    }
  };

  const canTriggerSimulation = user && (
    user.role === 'admin' ||
    user.role === 'Admin' ||
    user.role === 'safety_officer' ||
    user.role === 'SafetyOfficer'
  );

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
        {canTriggerSimulation && (
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
        )}

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
