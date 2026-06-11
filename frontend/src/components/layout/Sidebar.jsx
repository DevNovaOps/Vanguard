import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, Radio, Database, AlertTriangle, Shield,
  AlertCircle, Bot, Wrench, FileText, Webhook, BarChart3, Settings,
  ChevronLeft, ChevronRight, Users, Zap
} from 'lucide-react';
import VanguardARCIcon from '../common/VanguardARCIcon';
import { incidentService } from '../../utils/incidentService';
import { io } from 'socket.io-client';

const NAV_GROUPS = [
  {
    title: 'Operations',
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', module: 'dashboard' },
      { path: '/railway-network', icon: Map, label: 'Railway Network', module: 'railway-network' },
      { path: '/telemetry', icon: Radio, label: 'Telemetry Center', module: 'telemetry' },
      { path: '/infrastructure', icon: Database, label: 'Infrastructure DB', module: 'infrastructure' },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { path: '/risk-analysis', icon: AlertTriangle, label: 'Risk Analysis', module: 'risk-analysis' },
      { path: '/compliance', icon: Shield, label: 'Compliance Center', module: 'compliance' },
      { path: '/incidents', icon: AlertCircle, label: 'Incidents', module: 'incidents', badgeKey: 'incidents' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { path: '/autonomous-agent', icon: Bot, label: 'Autonomous Agent', module: 'autonomous-agent' },
      { path: '/mitigation', icon: Wrench, label: 'Mitigation Center', module: 'mitigation' },
      { path: '/simulation', icon: Zap, label: 'Failure Simulation', module: 'simulation' },
    ],
  },
  {
    title: 'System',
    items: [
      { path: '/dashboard/admin/approvals', icon: Users, label: 'User Approvals', module: 'user-approvals' },
      { path: '/audit-logs', icon: FileText, label: 'Audit Logs', module: 'audit-logs' },
      { path: '/webhooks', icon: Webhook, label: 'Webhook Center', module: 'webhooks' },
      { path: '/reports', icon: BarChart3, label: 'Reports', module: 'reports' },
      { path: '/settings', icon: Settings, label: 'Settings', module: 'settings' },
    ],
  },
];

const navItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Sidebar({ collapsed, onToggle }) {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [badgeCounts, setBadgeCounts] = useState({ incidents: 0 });

  const fetchBadgeCounts = useCallback(async () => {
    try {
      const statsRes = await incidentService.getDashboardStats();
      if (statsRes.success && statsRes.data) {
        setBadgeCounts({ incidents: statsRes.data.openIncidents });
      }
    } catch (err) {
      console.error('[SIDEBAR-BADGE] Failed to fetch badge counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchBadgeCounts();

    const socket = io();
    const handleUpdate = () => {
      fetchBadgeCounts();
    };

    socket.on('incident:create', handleUpdate);
    socket.on('incident:update', handleUpdate);
    socket.on('incident:resolve', handleUpdate);
    socket.on('incident:close', handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [fetchBadgeCounts]);

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname.startsWith('/dashboard');
    return location.pathname.startsWith(path);
  };

  let itemIndex = 0;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <motion.div
          className="sidebar-logo-icon"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <VanguardARCIcon size={38} />
        </motion.div>
        <div className="sidebar-logo-text">
          <span>Vanguard ARC</span>
          <span>Railway Intelligence</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => hasPermission(item.module));
          if (visibleItems.length === 0) return null;

          return (
            <div className="sidebar-group" key={group.title}>
              <motion.div
                className="sidebar-group-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {group.title}
              </motion.div>
              {visibleItems.map(item => {
                const idx = itemIndex++;
                const active = isActive(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${active ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <motion.div
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}
                      variants={navItemVariants}
                      initial="hidden"
                      animate="visible"
                      custom={idx}
                      whileHover={{ x: 4 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <motion.div
                        animate={active ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 0.4 }}
                      >
                        <item.icon size={18} className="nav-item-icon" />
                      </motion.div>
                      <span className="nav-item-text">{item.label}</span>
                      {item.badgeKey === 'incidents' && badgeCounts.incidents > 0 && (
                        <span className="nav-item-badge nav-item-text">{badgeCounts.incidents}</span>
                      )}
                    </motion.div>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <motion.button
          className="sidebar-collapse-btn"
          onClick={onToggle}
          aria-label="Toggle sidebar"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </motion.button>
      </div>
    </aside>
  );
}
