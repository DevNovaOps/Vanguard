import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../utils/authService.js';

const AuthContext = createContext(null);

const ROLES = {
  admin: { label: 'Admin', color: 'primary', defaultPath: '/dashboard/admin' },
  operator: { label: 'Operator', color: 'accent', defaultPath: '/dashboard/operator' },
  safety_officer: { label: 'Safety Officer', color: 'warning', defaultPath: '/dashboard/safety' },
  manager: { label: 'Manager', color: 'info', defaultPath: '/dashboard/manager' },
};

const ROLE_PERMISSIONS = {
  admin: ['dashboard', 'railway-network', 'telemetry', 'infrastructure', 'risk-analysis', 'compliance', 'incidents', 'autonomous-agent', 'mitigation', 'simulation', 'audit-logs', 'webhooks', 'reports', 'settings', 'user-approvals'],
  operator: ['dashboard', 'railway-network', 'telemetry', 'infrastructure', 'compliance', 'incidents', 'autonomous-agent', 'mitigation', 'simulation', 'reports'],
  safety_officer: ['dashboard', 'compliance', 'risk-analysis', 'incidents', 'autonomous-agent', 'mitigation', 'simulation', 'audit-logs', 'reports'],
  manager: ['dashboard', 'railway-network', 'compliance', 'risk-analysis', 'autonomous-agent', 'simulation', 'reports', 'settings'],
};

const DEMO_USERS = {
  admin: { id: 1, name: 'Arjun Mehta', email: 'arjun@vanguardarc.in', role: 'admin' },
  operator: { id: 2, name: 'Priya Sharma', email: 'priya@vanguardarc.in', role: 'operator' },
  safety_officer: { id: 3, name: 'Rajesh Kumar', email: 'rajesh@vanguardarc.in', role: 'safety_officer' },
  manager: { id: 4, name: 'Sneha Patel', email: 'sneha@vanguardarc.in', role: 'manager' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Normalize backend role (e.g. SafetyOfficer -> safety_officer)
  const normalizeUserRole = useCallback((rawUser) => {
    if (!rawUser) return null;
    const roleMap = {
      'Admin': 'admin',
      'Operator': 'operator',
      'SafetyOfficer': 'safety_officer',
      'Manager': 'manager'
    };
    return {
      ...rawUser,
      role: roleMap[rawUser.role] || rawUser.role?.toLowerCase() || 'operator'
    };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('arc_token');
    localStorage.removeItem('arc_user');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Check auth state and fetch profile if token exists
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('arc_token');
      if (token) {
        try {
          const res = await authService.getUserProfile();
          if (res.success && res.user) {
            const normalized = normalizeUserRole(res.user);
            setUser(normalized);
            setIsAuthenticated(true);
            localStorage.setItem('arc_user', JSON.stringify(normalized));
          } else {
            logout();
          }
        } catch (error) {
          console.error('[AUTH-CONTEXT] Init failed:', error.message);
          logout();
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, [normalizeUserRole, logout]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await authService.loginUser(email, password);
      if (res.success && res.token && res.user) {
        localStorage.setItem('arc_token', res.token);
        const normalized = normalizeUserRole(res.user);
        setUser(normalized);
        setIsAuthenticated(true);
        localStorage.setItem('arc_user', JSON.stringify(normalized));
        setLoading(false);
        return normalized;
      } else {
        throw new Error(res.message || 'Login failed');
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, [normalizeUserRole]);

  const loginWithOtp = useCallback(async (email) => {
    setLoading(true);
    try {
      const res = await authService.loginUserWithOtp(email);
      if (res.success && res.token && res.user) {
        localStorage.setItem('arc_token', res.token);
        const normalized = normalizeUserRole(res.user);
        setUser(normalized);
        setIsAuthenticated(true);
        localStorage.setItem('arc_user', JSON.stringify(normalized));
        setLoading(false);
        return normalized;
      } else {
        throw new Error(res.message || 'OTP Login failed');
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, [normalizeUserRole]);

  const register = useCallback(async (name, email, password, role, department) => {
    setLoading(true);
    try {
      const roleMap = {
        'admin': 'Admin',
        'operator': 'Operator',
        'safety_officer': 'SafetyOfficer',
        'manager': 'Manager'
      };
      const backendRole = roleMap[role] || 'Operator';

      const res = await authService.registerUser({
        name,
        email,
        password,
        role: backendRole,
        department
      });

      if (res.success && res.token && res.user) {
        const normalized = normalizeUserRole(res.user);
        if (normalized.isActive) {
          localStorage.setItem('arc_token', res.token);
          setUser(normalized);
          setIsAuthenticated(true);
          localStorage.setItem('arc_user', JSON.stringify(normalized));
        }
        setLoading(false);
        return normalized;
      } else {
        throw new Error(res.message || 'Registration failed');
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, [normalizeUserRole]);

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
      loading,
      login,
      loginWithOtp,
      logout,
      register,
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
