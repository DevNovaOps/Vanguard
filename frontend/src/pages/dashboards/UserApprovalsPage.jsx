import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import { authService } from '../../utils/authService';
import { Users, CheckCircle, ShieldAlert, Check } from 'lucide-react';

export default function UserApprovalsPage() {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.getAllUsers();
      if (res.success) {
        setUsersList(res.users);
      } else {
        setError('Failed to fetch users list');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (userId) => {
    try {
      const res = await authService.approveUser(userId);
      if (res.success) {
        setUsersList(prev => prev.map(u => u._id === userId ? { ...u, isActive: true } : u));
        showSuccessMessage('User approved successfully.');
      }
    } catch (err) {
      alert('Approval failed: ' + err.message);
    }
  };

  const handleApproveAll = async () => {
    const pendingUsers = usersList.filter(u => !u.isActive);
    if (pendingUsers.length === 0) {
      alert('There are no pending approval requests at the moment.');
      return;
    }

    if (!window.confirm(`Are you sure you want to approve all ${pendingUsers.length} pending users?`)) return;

    try {
      setLoading(true);
      const res = await authService.approveAllUsers();
      if (res.success) {
        setUsersList(prev => prev.map(u => ({ ...u, isActive: true })));
        showSuccessMessage(`All ${pendingUsers.length} users approved successfully!`);
      }
    } catch (err) {
      alert('Failed to approve all users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Are you sure you want to reject and delete this user?')) return;
    try {
      const res = await authService.rejectUser(userId);
      if (res.success) {
        setUsersList(prev => prev.filter(u => u._id !== userId));
        showSuccessMessage('User request rejected and deleted.');
      }
    } catch (err) {
      alert('Rejection failed: ' + err.message);
    }
  };

  const showSuccessMessage = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const normalizeUserRole = (rawRole) => {
    const roleMap = {
      'Admin': 'admin',
      'Operator': 'operator',
      'SafetyOfficer': 'safety_officer',
      'Manager': 'manager'
    };
    return roleMap[rawRole] || rawRole?.toLowerCase() || 'operator';
  };

  const pendingCount = usersList.filter(u => !u.isActive).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>User Approvals</h1>
          <p>Access management, registration reviews, and RBAC control logs</p>
        </div>
        <div className="page-actions">
          <motion.button
            className="btn btn-primary btn-sm"
            style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
            onClick={handleApproveAll}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={pendingCount === 0}
          >
            <Check size={14} /> Approve All Pending ({pendingCount})
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '0.85rem 1.25rem',
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
            <span>{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="col-12">
          <ChartCard
            title="Access Approvals & Requests"
            subtitle="View, approve, or reject access requests to the Vanguard Industrial Monitoring platform"
          >
            {loading && usersList.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'inline-block', marginBottom: '1rem' }} className="loading-spinner" />
                <p>Retrieving registration records...</p>
              </div>
            ) : error ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-danger)' }}>
                <ShieldAlert size={48} style={{ marginBottom: '1rem' }} />
                <p>{error}</p>
                <button className="btn btn-secondary btn-sm" onClick={fetchUsers} style={{ marginTop: '1rem' }}>
                  Retry
                </button>
              </div>
            ) : usersList.length === 0 ? (
              <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <Users size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <h3>No Users Registered</h3>
                <p style={{ maxWidth: '400px', margin: '0.5rem auto 0 auto', fontSize: 'var(--text-sm)' }}>
                  There are no other active or pending system users registered on this platform.
                </p>
              </div>
            ) : (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-secondary)', height: '40px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                      <th style={{ padding: '0.75rem' }}>FULL NAME</th>
                      <th style={{ padding: '0.75rem' }}>EMAIL</th>
                      <th style={{ padding: '0.75rem' }}>ROLE</th>
                      <th style={{ padding: '0.75rem' }}>DEPARTMENT</th>
                      <th style={{ padding: '0.75rem' }}>STATUS</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--border-secondary)', height: '56px', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 'var(--font-medium)' }}>{u.name}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <StatusBadge status={normalizeUserRole(u.role)} />
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-tertiary)' }}>{u.department || 'N/A'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 'var(--font-semibold)',
                            color: u.isActive ? 'var(--color-success-400)' : 'var(--color-warning-400)',
                          }}>
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: u.isActive ? 'var(--color-success)' : 'var(--color-warning)',
                            }} />
                            {u.isActive ? 'Active' : 'Pending Approval'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            {!u.isActive && (
                              <motion.button
                                className="btn btn-primary btn-xs"
                                onClick={() => handleApprove(u._id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', background: 'var(--color-success)', border: 'none' }}
                              >
                                Approve
                              </motion.button>
                            )}
                            <motion.button
                              className="btn btn-secondary btn-xs"
                              onClick={() => handleReject(u._id)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            >
                              {u.isActive ? 'Deactivate' : 'Reject'}
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
