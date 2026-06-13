import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api.js';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertOctagon, Info, CheckCircle, Bell, X } from 'lucide-react';

const NotificationContext = createContext(null);

// Helper to determine if a notification is visible/authorized for a user
const isNotificationForUser = (notif, user) => {
  if (!user) return false;
  
  const roleMap = {
    admin: 'Admin',
    safety_officer: 'SafetyOfficer',
    operator: 'Operator',
    manager: 'Manager'
  };
  
  const userRole = roleMap[user.role] || user.role;
  const userId = user._id || user.id;

  if (userRole === 'Admin') return true;
  
  if (userRole === 'Manager') {
    return ['High', 'Critical'].includes(notif.severity);
  }

  // Module check
  if (userRole === 'SafetyOfficer') {
    const allowedModules = ['Compliance', 'Risk', 'Incident', 'AutonomousAgent', 'Mitigation'];
    if (!allowedModules.includes(notif.module)) return false;
  } else if (userRole === 'Operator') {
    const allowedModules = ['Incident', 'Mitigation', 'Simulation', 'Sensor', 'SensorData', 'TransitNode'];
    if (!allowedModules.includes(notif.module)) return false;
  } else {
    return false;
  }

  // Recipient filtering
  if (notif.recipientUsers && notif.recipientUsers.length > 0) {
    const userMatch = notif.recipientUsers.some(
      u => (u._id || u).toString() === userId.toString()
    );
    if (!userMatch) return false;
  }
  
  if (notif.recipientRoles && notif.recipientRoles.length > 0) {
    if (!notif.recipientRoles.includes(userRole)) return false;
  }

  return true;
};

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({
    totalNotifications: 0,
    unreadNotifications: 0,
    criticalNotifications: 0
  });
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);

  // Add toast alert with auto-dismiss
  const addToast = useCallback((notif) => {
    const id = notif.notificationId || Date.now().toString();
    setToasts(prev => [...prev, { ...notif, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      const res = await api.get('/api/notifications?limit=50');
      if (res.success) {
        setNotifications(res.data);
      }
      
      const statsRes = await api.get('/api/notifications/dashboard');
      if (statsRes.success) {
        setStats(statsRes.data);
        setUnreadCount(statsRes.data.unreadNotifications);
      }
    } catch (err) {
      console.error('[NOTIFICATIONS-CONTEXT] Fetch failed:', err);
    }
  }, [isAuthenticated, user]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      const res = await api.patch(`/api/notifications/${id}/read`, {});
      if (res.success) {
        setNotifications(prev => 
          prev.map(n => n.notificationId === id || n._id === id ? { ...n, isRead: true, readAt: new Date() } : n)
        );
        // Recalculate unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
        setStats(prev => ({
          ...prev,
          unreadNotifications: Math.max(0, prev.unreadNotifications - 1),
          criticalNotifications: res.data.severity === 'Critical' ? Math.max(0, prev.criticalNotifications - 1) : prev.criticalNotifications
        }));
      }
    } catch (err) {
      console.error('[NOTIFICATIONS-CONTEXT] Mark read failed:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await api.patch('/api/notifications/read-all', {});
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date() })));
        setUnreadCount(0);
        setStats(prev => ({
          ...prev,
          unreadNotifications: 0,
          criticalNotifications: 0
        }));
      }
    } catch (err) {
      console.error('[NOTIFICATIONS-CONTEXT] Mark all read failed:', err);
    }
  }, []);

  // Delete notification (Admin only)
  const deleteNotification = useCallback(async (id) => {
    try {
      const res = await api.delete(`/api/notifications/${id}`);
      if (res.success) {
        setNotifications(prev => prev.filter(n => n.notificationId !== id && n._id !== id));
        fetchNotifications(); // Refresh stats
      }
    } catch (err) {
      console.error('[NOTIFICATIONS-CONTEXT] Delete failed:', err);
    }
  }, [fetchNotifications]);

  // Connect Socket.IO
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    fetchNotifications();

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[NOTIFICATIONS-SOCKET] Connected:', socket.id);
    });

    socket.on('notification:new', (notif) => {
      console.log('[NOTIFICATIONS-SOCKET] New notification received:', notif);
      if (isNotificationForUser(notif, user)) {
        // Prepend to list
        setNotifications(prev => {
          // Prevent duplicates
          if (prev.some(n => n.notificationId === notif.notificationId)) return prev;
          return [{ ...notif, isRead: false }, ...prev].slice(0, 100);
        });
        
        // Update stats/badge count
        setUnreadCount(prev => prev + 1);
        setStats(prev => ({
          ...prev,
          totalNotifications: prev.totalNotifications + 1,
          unreadNotifications: prev.unreadNotifications + 1,
          criticalNotifications: notif.severity === 'Critical' ? prev.criticalNotifications + 1 : prev.criticalNotifications
        }));

        // Trigger toast for high/critical notifications
        if (['High', 'Critical'].includes(notif.severity)) {
          addToast(notif);
        }
      }
    });

    socket.on('notification:read', (data) => {
      const userId = user._id || user.id;
      if (data.userId.toString() === userId.toString()) {
        setNotifications(prev =>
          prev.map(n => n.notificationId === data.notificationId ? { ...n, isRead: true } : n)
        );
        fetchNotifications(); // refresh statistics
      }
    });

    socket.on('notification:read-all', (data) => {
      const userId = user._id || user.id;
      if (data.userId.toString() === userId.toString()) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        setStats(prev => ({
          ...prev,
          unreadNotifications: 0,
          criticalNotifications: 0
        }));
      }
    });

    socket.on('notification:delete', (data) => {
      setNotifications(prev => prev.filter(n => n.notificationId !== data.notificationId));
      fetchNotifications();
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user, fetchNotifications, addToast]);

  // Helper to render lucide icon according to severity
  const getToastIcon = (severity) => {
    switch (severity) {
      case 'Critical':
        return <AlertOctagon className="text-red-500 toast-icon" size={20} />;
      case 'High':
        return <AlertTriangle className="text-warning toast-icon" size={20} />;
      case 'Warning':
        return <AlertTriangle className="text-warning toast-icon" size={20} />;
      default:
        return <Info className="text-info toast-icon" size={20} />;
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      stats,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification
    }}>
      {children}

      {/* Floating Premium Toasts UI */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`toast border-l-4 ${
                toast.severity === 'Critical' ? 'border-red-500' : 'border-warning'
              }`}
            >
              <div className="flex items-start gap-3 w-full">
                {getToastIcon(toast.severity)}
                <div className="toast-body">
                  <div className="toast-title flex items-center gap-1.5 font-semibold text-sm">
                    <span className={`h-2 w-2 rounded-full ${
                      toast.severity === 'Critical' ? 'bg-red-500' : 'bg-warning'
                    }`} />
                    {toast.title}
                  </div>
                  <div className="toast-message text-xs text-secondary mt-1">{toast.message}</div>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="btn btn-ghost btn-icon btn-xs text-secondary hover:text-primary ml-auto"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
}

export default NotificationContext;
