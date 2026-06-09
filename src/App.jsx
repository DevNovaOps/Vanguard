import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SimulationProvider } from './contexts/SimulationContext';

import PublicLayout from './components/layout/PublicLayout';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import FeaturesPage from './pages/public/FeaturesPage';
import DocumentationPage from './pages/public/DocumentationPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

// Dashboards
import AdminDashboard from './pages/dashboards/AdminDashboard';
import OperatorDashboard from './pages/dashboards/OperatorDashboard';
import SafetyDashboard from './pages/dashboards/SafetyDashboard';
import ManagerDashboard from './pages/dashboards/ManagerDashboard';

// Modules
import TelemetryCenter from './pages/modules/TelemetryCenter';
import InfrastructureDatabase from './pages/modules/InfrastructureDatabase';
import RiskAnalysis from './pages/modules/RiskAnalysis';
import ComplianceCenter from './pages/modules/ComplianceCenter';
import IncidentManagement from './pages/modules/IncidentManagement';
import AutonomousAgent from './pages/modules/AutonomousAgent';
import MitigationCenter from './pages/modules/MitigationCenter';
import AuditLogs from './pages/modules/AuditLogs';
import WebhookCenter from './pages/modules/WebhookCenter';
import Reports from './pages/modules/Reports';
import RailwayNetwork from './pages/modules/RailwayNetwork';
import SettingsPage from './pages/settings/Settings';

function DashboardRedirect() {
  const { user } = useAuth();
  const roleRoutes = {
    admin: '/dashboard/admin',
    operator: '/dashboard/operator',
    safety_officer: '/dashboard/safety',
    manager: '/dashboard/manager',
  };
  return <Navigate to={roleRoutes[user?.role] || '/dashboard/admin'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/documentation" element={<DocumentationPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/dashboard/operator" element={<OperatorDashboard />} />
        <Route path="/dashboard/safety" element={<SafetyDashboard />} />
        <Route path="/dashboard/manager" element={<ManagerDashboard />} />
        <Route path="/railway-network" element={<RailwayNetwork />} />
        <Route path="/telemetry" element={<TelemetryCenter />} />
        <Route path="/infrastructure" element={<InfrastructureDatabase />} />
        <Route path="/risk-analysis" element={<RiskAnalysis />} />
        <Route path="/compliance" element={<ComplianceCenter />} />
        <Route path="/incidents" element={<IncidentManagement />} />
        <Route path="/autonomous-agent" element={<AutonomousAgent />} />
        <Route path="/mitigation" element={<MitigationCenter />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/webhooks" element={<WebhookCenter />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SimulationProvider>
            <AppRoutes />
          </SimulationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
