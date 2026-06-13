import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import StatusBadge from '../../components/common/StatusBadge';
import { Settings, User, Bell, Palette, Key, Server, Sun, Moon, Monitor, CheckCircle, AlertCircle } from 'lucide-react';

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'system', label: 'System', icon: Server },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, getRoleInfo, updateUserProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const roleInfo = getRoleInfo();

  // Profile fields state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [department, setDepartment] = useState(user?.department || 'Railway Operations');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');


  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await updateUserProfile({ name, email, department });
      setSuccessMessage('Profile updated successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update profile.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Settings size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /><span className="gradient-text">Settings</span></h1>
          <p>Platform configuration and preferences</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-nav" style={{ position: 'relative' }}>
          {SETTINGS_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                className={`settings-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                style={{ position: 'relative', backgroundColor: isActive ? 'transparent' : undefined }}
              >
                {isActive && (
                  <motion.div
                    className="nav-item-active-bg"
                    layoutId="activeSettingsNav"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 0
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1 }}>
                  <tab.icon size={16} /> {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="settings-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'profile' && (
              <>
                <div className="settings-section">
                  <h3>Profile Information</h3>

                  <AnimatePresence>
                    {successMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        style={{
                          padding: '0.75rem 1rem',
                          background: 'rgba(52, 211, 153, 0.08)',
                          border: '1px solid var(--color-success)',
                          borderRadius: 'var(--radius-lg)',
                          color: '#34D399',
                          fontSize: 'var(--text-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '1.5rem'
                        }}
                      >
                        <CheckCircle size={16} />
                        <span>{successMessage}</span>
                      </motion.div>
                    )}
                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        style={{
                          padding: '0.75rem 1rem',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid var(--color-danger)',
                          borderRadius: 'var(--radius-lg)',
                          color: '#F87171',
                          fontSize: 'var(--text-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '1.5rem'
                        }}
                      >
                        <AlertCircle size={16} />
                        <span>{errorMessage}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <motion.div
                      className="user-avatar"
                      style={{ width: 64, height: 64, fontSize: 'var(--text-xl)' }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {user?.name?.charAt(0) || 'U'}
                    </motion.div>
                    <div>
                      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>{user?.name}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>{user?.email}</div>
                      <StatusBadge status={roleInfo?.label || 'admin'} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label>Full Name</label>
                      <input className="input" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>Email</label>
                      <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>Role</label>
                      <input className="input" value={roleInfo?.label} disabled />
                    </div>
                    <div className="input-group">
                      <label>Department</label>
                      <input className="input" value={department} onChange={e => setDepartment(e.target.value)} />
                    </div>
                  </div>
                </div>
                <motion.button 
                  className="btn btn-primary" 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </motion.button>
              </>
            )}

            {activeTab === 'notifications' && (
              <div className="settings-section">
                <h3>Notification Preferences</h3>
                {[
                  'Incident alerts', 'Risk threshold breaches', 'Compliance violations',
                  'Agent actions', 'System maintenance', 'Weekly reports',
                ].map((pref, i) => (
                  <motion.div
                    key={pref}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.75rem 0', borderBottom: '1px solid var(--border-secondary)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)' }}>{pref}</span>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <div className="toggle-track">
                        <div className="toggle-thumb" />
                      </div>
                    </label>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h3>Theme</h3>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor },
                  ].map(t => (
                    <motion.div
                      key={t.id}
                      className={`role-option ${theme === t.id ? 'selected' : ''}`}
                      onClick={() => setTheme(t.id)}
                      style={{ flex: 1, padding: '1.5rem', cursor: 'pointer' }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <t.icon size={24} style={{ margin: '0 auto 0.5rem', display: 'block', color: theme === t.id ? 'var(--color-primary-500)' : 'var(--text-tertiary)' }} />
                      <div className="role-option-title">{t.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="settings-section">
                <h3>API Keys</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Manage API keys for external integrations.
                </p>
                {[
                  { name: 'Production Key', code: 'arc_pk_live_••••••••••••4f3d' },
                  { name: 'Test Key', code: 'arc_pk_test_••••••••••••8a2b' },
                ].map((key, i) => (
                  <motion.div
                    key={key.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                      padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)',
                      borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{key.name}</div>
                        <code style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{key.code}</code>
                      </div>
                      <StatusBadge status="active" />
                    </div>
                  </motion.div>
                ))}
                <motion.button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Key size={14} /> Generate New Key
                </motion.button>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="settings-section">
                <h3>System Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    ['Platform Version', 'v2.4.1'],
                    ['API Version', 'v3.0'],
                    ['Database', 'PostgreSQL 16'],
                    ['Cache', 'Redis 7.2'],
                    ['Environment', 'Production'],
                    ['Region', 'ap-south-1 (Mumbai)'],
                    ['Uptime', '99.97% (30d)'],
                    ['Last Deploy', '2026-06-05 14:30 IST'],
                  ].map(([label, value], i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', fontFamily: 'var(--font-mono)' }}>{value}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
