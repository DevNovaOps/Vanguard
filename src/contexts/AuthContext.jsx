import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const ROLES = {
  admin: { label: 'Admin', color: 'primary', defaultPath: '/dashboard/admin' },
  operator: { label: 'Operator', color: 'accent', defaultPath: '/dashboard/operator' },
  safety_officer: { label: 'Safety Officer', color: 'warning', defaultPath: '/dashboard/safety' },
  manager: { label: 'Manager', color: 'info', defaultPath: '/dashboard/manager' },
};

const ROLE_PERMISSIONS = {
  admin: ['dashboard', 'railway-network', 'telemetry', 'infrastructure', 'risk-analysis', 'compliance', 'incidents', 'autonomous-agent', 'mitigation', 'audit-logs', 'webhooks', 'reports', 'settings'],
  operator: ['dashboard', 'railway-network', 'telemetry', 'infrastructure', 'incidents', 'mitigation', 'reports'],
  safety_officer: ['dashboard', 'compliance', 'risk-analysis', 'incidents', 'mitigation', 'audit-logs', 'reports'],
  manager: ['dashboard', 'railway-network', 'risk-analysis', 'reports', 'settings'],
};

const DEMO_USERS = {
  admin: { id: 1, name: 'Arjun Mehta', email: 'arjun@vanguardarc.in', role: 'admin' },
  operator: { id: 2, name: 'Priya Sharma', email: 'priya@vanguardarc.in', role: 'operator' },
  safety_officer: { id: 3, name: 'Rajesh Kumar', email: 'rajesh@vanguardarc.in', role: 'safety_officer' },
  manager: { id: 4, name: 'Sneha Patel', email: 'sneha@vanguardarc.in', role: 'manager' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('arc_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(!!user);

  useEffect(() => {
    if (user) {
      localStorage.setItem('arc_user', JSON.stringify(user));
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('arc_user');
      setIsAuthenticated(false);
    }
  }, [user]);

  const login = useCallback((role) => {
    const demoUser = DEMO_USERS[role] || DEMO_USERS.admin;
    setUser(demoUser);
    return demoUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const hasPermission = useCallback((module) => {
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes(module);
  }, [user]);

  const getRoleInfo = useCallback(() => {
    if (!user) return null;
    return ROLES[user.role] || ROLES.admin;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      logout,
      hasPermission,
      getRoleInfo,
      ROLES,
      ROLE_PERMISSIONS,
      DEMO_USERS,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
